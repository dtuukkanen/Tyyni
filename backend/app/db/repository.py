"""Single read/write entry point for simulators (#6-#8), inference (#2) and UI (#3).

Days are UTC calendar days, matching the `time_bucket('1 day', ts)` used by the
continuous aggregates. A sleep session counts toward the day the user woke up.
"""

import uuid
from collections.abc import Iterable, Mapping
from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy import insert, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.db.models import ActivitySample, HeartSample, MoodCheckin, SleepSession, User

METRICS = (
    "hr_avg",
    "hr_min",
    "hrv_rmssd_avg",
    "steps",
    "active_minutes",
    "screen_time_min",
    "sleep_duration_min",
    "bedtime_hour",
    "wake_hour",
    "mood_avg",
)


def create_user(session: Session, display_name: str, timezone: str = "Europe/Helsinki") -> uuid.UUID:
    user = User(display_name=display_name, timezone=timezone)
    session.add(user)
    session.flush()
    return user.id


def _upsert_samples(session: Session, model, rows: Iterable[Mapping[str, Any]]) -> int:
    rows = list(rows)
    if not rows:
        return 0
    stmt = pg_insert(model).values(rows)
    update_cols = {c: stmt.excluded[c] for c in rows[0] if c not in ("user_id", "ts")}
    stmt = stmt.on_conflict_do_update(index_elements=["user_id", "ts"], set_=update_cols)
    session.execute(stmt)
    return len(rows)


def insert_heart_samples(session: Session, rows: Iterable[Mapping[str, Any]]) -> int:
    """rows: {user_id, ts, hr_bpm, hrv_rmssd_ms[, source]}. Re-inserting a ts overwrites it."""
    return _upsert_samples(session, HeartSample, rows)


def insert_activity_samples(session: Session, rows: Iterable[Mapping[str, Any]]) -> int:
    """rows: {user_id, ts, steps, active_minutes, screen_time_min[, source]}."""
    return _upsert_samples(session, ActivitySample, rows)


def insert_sleep_session(
    session: Session,
    user_id: uuid.UUID,
    bedtime: datetime,
    wake_time: datetime,
    efficiency: float | None = None,
    stages: dict | None = None,
    source: str = "device",
) -> int:
    return session.execute(
        insert(SleepSession)
        .values(
            user_id=user_id,
            bedtime=bedtime,
            wake_time=wake_time,
            efficiency=efficiency,
            stages=stages,
            source=source,
        )
        .returning(SleepSession.id)
    ).scalar_one()


def record_mood(
    session: Session, user_id: uuid.UUID, score: int, ts: datetime | None = None, note: str | None = None
) -> int:
    values: dict[str, Any] = {"user_id": user_id, "score": score, "note": note}
    if ts is not None:
        values["ts"] = ts
    return session.execute(
        insert(MoodCheckin).values(**values).returning(MoodCheckin.id)
    ).scalar_one()


def delete_source_data(session: Session, user_id: uuid.UUID, source_prefix: str) -> None:
    """Remove e.g. all 'simulator:%' data for a user so a scenario can be re-run."""
    params = {"u": user_id, "p": f"{source_prefix}%"}
    for table in ("heart_samples", "activity_samples", "sleep_sessions"):
        session.execute(text(f"DELETE FROM {table} WHERE user_id = :u AND source LIKE :p"), params)


_DAILY_SQL = text(
    """
    WITH days AS (
        SELECT d::date AS day
        FROM generate_series(CAST(:start AS date), CAST(:end AS date), interval '1 day') AS d
    ),
    sleep AS (
        SELECT (wake_time AT TIME ZONE 'UTC')::date AS day,
               SUM(duration_min)::float AS sleep_duration_min,
               MIN(EXTRACT(EPOCH FROM (bedtime AT TIME ZONE 'UTC')
                   - ((wake_time AT TIME ZONE 'UTC')::date - 1)::timestamp) / 3600.0) AS bedtime_hour,
               MAX(EXTRACT(EPOCH FROM (wake_time AT TIME ZONE 'UTC')
                   - ((wake_time AT TIME ZONE 'UTC')::date)::timestamp) / 3600.0) AS wake_hour
        FROM sleep_sessions
        WHERE user_id = :user_id
        GROUP BY 1
    ),
    mood AS (
        SELECT (ts AT TIME ZONE 'UTC')::date AS day, AVG(score)::float AS mood_avg
        FROM mood_checkins
        WHERE user_id = :user_id
        GROUP BY 1
    )
    SELECT days.day,
           h.hr_avg, h.hr_min, h.hrv_rmssd_avg,
           a.steps, a.active_minutes, a.screen_time_min,
           s.sleep_duration_min, s.bedtime_hour, s.wake_hour,
           m.mood_avg
    FROM days
    LEFT JOIN heart_daily h
           ON h.user_id = :user_id AND (h.day AT TIME ZONE 'UTC')::date = days.day
    LEFT JOIN activity_daily a
           ON a.user_id = :user_id AND (a.day AT TIME ZONE 'UTC')::date = days.day
    LEFT JOIN sleep s ON s.day = days.day
    LEFT JOIN mood m ON m.day = days.day
    ORDER BY days.day
    """
)


def daily_metrics(session: Session, user_id: uuid.UUID, start: date, end: date) -> list[dict[str, Any]]:
    """One row per day in [start, end] with all metrics; missing data is None.

    bedtime_hour is hours since midnight of the day *before* waking (so 23:30 -> 23.5,
    01:00 -> 25.0), which keeps late-shifting bedtimes monotonic for baselines.
    """
    result = session.execute(_DAILY_SQL, {"user_id": user_id, "start": start, "end": end})
    return [dict(r._mapping) for r in result]


def rolling_baseline(
    session: Session, user_id: uuid.UUID, day: date, window: int = 14
) -> dict[str, float | None]:
    """Mean of each metric over the `window` days *before* `day` (not including it)."""
    rows = daily_metrics(session, user_id, day - timedelta(days=window), day - timedelta(days=1))
    baseline: dict[str, float | None] = {}
    for metric in METRICS:
        values = [r[metric] for r in rows if r[metric] is not None]
        baseline[metric] = sum(values) / len(values) if values else None
    return baseline
