"""Single read/write entry point for simulators (#6-#8, journal), inference (#2) and UI (#3).

Days are UTC calendar days. A sleep session counts toward the day the user woke up.
"""

import uuid
from collections.abc import Iterable, Mapping
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import insert, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.db.models import (
    ActivitySample,
    Anomaly,
    HeartSample,
    JournalEntry,
    MoodCheckin,
    SleepSession,
    User,
)

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


def create_user(
    session: Session, display_name: str, timezone: str = "Europe/Helsinki"
) -> uuid.UUID:
    user = User(display_name=display_name, timezone=timezone)
    session.add(user)
    session.flush()
    return user.id


def get_user(session: Session, user_id: uuid.UUID) -> User | None:
    return session.get(User, user_id)


def list_users(session: Session) -> list[User]:
    return list(session.scalars(select(User).order_by(User.created_at)))


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
    session: Session,
    user_id: uuid.UUID,
    score: int,
    ts: datetime | None = None,
    note: str | None = None,
) -> int:
    values: dict[str, Any] = {"user_id": user_id, "score": score, "note": note}
    if ts is not None:
        values["ts"] = ts
    return session.execute(
        insert(MoodCheckin).values(**values).returning(MoodCheckin.id)
    ).scalar_one()


def record_journal_entry(
    session: Session,
    user_id: uuid.UUID,
    text: str,
    ts: datetime | None = None,
    language: str | None = None,
) -> int:
    """A journal entry written in the app (no ground truth)."""
    values: dict[str, Any] = {"user_id": user_id, "text": text, "language": language}
    if ts is not None:
        values["ts"] = ts
    return session.execute(
        insert(JournalEntry).values(**values).returning(JournalEntry.id)
    ).scalar_one()


def insert_journal_entries(session: Session, rows: Iterable[Mapping[str, Any]]) -> int:
    """rows: {user_id, ts, text[, language, source, expected_label, expected_risk]}."""
    rows = list(rows)
    if rows:
        session.execute(insert(JournalEntry), rows)
    return len(rows)


def _utc_day_start(day: date) -> datetime:
    return datetime(day.year, day.month, day.day, tzinfo=UTC)


def heart_samples(
    session: Session, user_id: uuid.UUID, start: datetime, end: datetime
) -> list[HeartSample]:
    """Heart samples with start <= ts < end, oldest first."""
    return list(
        session.scalars(
            select(HeartSample)
            .where(HeartSample.user_id == user_id, HeartSample.ts >= start, HeartSample.ts < end)
            .order_by(HeartSample.ts)
        )
    )


def activity_samples(
    session: Session, user_id: uuid.UUID, start: datetime, end: datetime
) -> list[ActivitySample]:
    """Activity samples with start <= ts < end, oldest first."""
    return list(
        session.scalars(
            select(ActivitySample)
            .where(
                ActivitySample.user_id == user_id,
                ActivitySample.ts >= start,
                ActivitySample.ts < end,
            )
            .order_by(ActivitySample.ts)
        )
    )


def sleep_sessions(
    session: Session, user_id: uuid.UUID, start: date, end: date
) -> list[SleepSession]:
    """Sleep sessions whose UTC wake day is in [start, end], oldest first."""
    return list(
        session.scalars(
            select(SleepSession)
            .where(
                SleepSession.user_id == user_id,
                SleepSession.wake_time >= _utc_day_start(start),
                SleepSession.wake_time < _utc_day_start(end + timedelta(days=1)),
            )
            .order_by(SleepSession.wake_time)
        )
    )


def mood_checkins(
    session: Session, user_id: uuid.UUID, start: date, end: date
) -> list[MoodCheckin]:
    """Mood check-ins on UTC days [start, end], oldest first."""
    return list(
        session.scalars(
            select(MoodCheckin)
            .where(
                MoodCheckin.user_id == user_id,
                MoodCheckin.ts >= _utc_day_start(start),
                MoodCheckin.ts < _utc_day_start(end + timedelta(days=1)),
            )
            .order_by(MoodCheckin.ts)
        )
    )


def journal_entries(
    session: Session, user_id: uuid.UUID, start: date, end: date
) -> list[JournalEntry]:
    """Journal entries on UTC days [start, end], oldest first."""
    return list(
        session.scalars(
            select(JournalEntry)
            .where(
                JournalEntry.user_id == user_id,
                JournalEntry.ts >= _utc_day_start(start),
                JournalEntry.ts < _utc_day_start(end + timedelta(days=1)),
            )
            .order_by(JournalEntry.ts, JournalEntry.id)
        )
    )


def anomalies(session: Session, user_id: uuid.UUID, start: date, end: date) -> list[Anomaly]:
    """Stored anomalies on days [start, end], by day and id."""
    return list(
        session.scalars(
            select(Anomaly)
            .where(Anomaly.user_id == user_id, Anomaly.day >= start, Anomaly.day <= end)
            .order_by(Anomaly.day, Anomaly.id)
        )
    )


def replace_anomalies(
    session: Session,
    user_id: uuid.UUID,
    start: date,
    end: date,
    rows: Iterable[Mapping[str, Any]],
) -> list[Anomaly]:
    """Make the stored anomalies on days [start, end] equal `rows`.

    rows: {day, kind, severity, metric, value, baseline, explanation}. A stored anomaly with
    the same day and kind is updated in place and keeps its id (suggestions and alerts point
    at it); stored anomalies that are no longer in `rows` are deleted.
    """
    existing: dict[tuple[date, str], Anomaly] = {}
    for a in anomalies(session, user_id, start, end):
        if (a.day, a.kind) in existing:
            session.delete(a)
        else:
            existing[(a.day, a.kind)] = a
    kept: list[Anomaly] = []
    for row in rows:
        a = existing.pop((row["day"], row["kind"]), None)
        if a is None:
            a = Anomaly(user_id=user_id, **row)
            session.add(a)
        else:
            for k, v in row.items():
                setattr(a, k, v)
        kept.append(a)
    for a in existing.values():
        session.delete(a)
    session.flush()
    return kept


def delete_source_data(session: Session, user_id: uuid.UUID, source_prefix: str) -> None:
    """Remove e.g. all 'simulator:%' data for a user so a scenario can be re-run."""
    params = {"u": user_id, "p": f"{source_prefix}%"}
    for table in ("heart_samples", "activity_samples", "sleep_sessions", "journal_entries"):
        session.execute(text(f"DELETE FROM {table} WHERE user_id = :u AND source LIKE :p"), params)


_DAILY_SQL = text(
    """
    WITH days AS (
        SELECT d::date AS day
        FROM generate_series(CAST(:start AS date), CAST(:end AS date), interval '1 day') AS d
    ),
    -- Heart/activity are aggregated straight from the hypertables (bounded to the range, so
    -- only the matching chunks are scanned). Timescale continuous aggregates were dropped in
    -- 0002: real-time aggregation only covers rows newer than the watermark, so backfilled
    -- or deleted simulator data stayed invisible or stale until the next policy refresh.
    heart AS (
        SELECT (ts AT TIME ZONE 'UTC')::date AS day,
               AVG(hr_bpm) AS hr_avg,
               MIN(hr_bpm) AS hr_min,
               AVG(hrv_rmssd_ms) AS hrv_rmssd_avg
        FROM heart_samples
        WHERE user_id = :user_id
          AND ts >= CAST(:start AS date)::timestamp AT TIME ZONE 'UTC'
          AND ts < (CAST(:end AS date) + 1)::timestamp AT TIME ZONE 'UTC'
        GROUP BY 1
    ),
    activity AS (
        SELECT (ts AT TIME ZONE 'UTC')::date AS day,
               SUM(steps)::bigint AS steps,
               SUM(active_minutes) AS active_minutes,
               SUM(screen_time_min) AS screen_time_min
        FROM activity_samples
        WHERE user_id = :user_id
          AND ts >= CAST(:start AS date)::timestamp AT TIME ZONE 'UTC'
          AND ts < (CAST(:end AS date) + 1)::timestamp AT TIME ZONE 'UTC'
        GROUP BY 1
    ),
    sleep AS (
        SELECT (wake_time AT TIME ZONE 'UTC')::date AS day,
               SUM(duration_min)::float AS sleep_duration_min,
               MIN(EXTRACT(EPOCH FROM (bedtime AT TIME ZONE 'UTC')
                   - ((wake_time AT TIME ZONE 'UTC')::date - 1)::timestamp)
                   / 3600.0) AS bedtime_hour,
               MAX(EXTRACT(EPOCH FROM (wake_time AT TIME ZONE 'UTC')
                   - ((wake_time AT TIME ZONE 'UTC')::date)::timestamp)
                   / 3600.0) AS wake_hour
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
    LEFT JOIN heart h ON h.day = days.day
    LEFT JOIN activity a ON a.day = days.day
    LEFT JOIN sleep s ON s.day = days.day
    LEFT JOIN mood m ON m.day = days.day
    ORDER BY days.day
    """
)


def daily_metrics(
    session: Session, user_id: uuid.UUID, start: date, end: date
) -> list[dict[str, Any]]:
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
