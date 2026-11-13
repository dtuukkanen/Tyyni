"""Integration tests against the containerized DB: docker compose run --rm migrate pytest"""

from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy import text

from app.db import get_session
from app.db import repository as repo

START = date(2026, 10, 1)
DAYS = 15


def _at(day: date, hour: int, minute: int = 0) -> datetime:
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=UTC)


@pytest.fixture
def user_id():
    with get_session() as s:
        uid = repo.create_user(s, "test-user")
    yield uid
    with get_session() as s:
        s.execute(text("DELETE FROM users WHERE id = :u"), {"u": uid})


@pytest.fixture
def seeded(user_id):
    """15 days: hourly HR/HRV and activity, one sleep per night, one mood per day.

    Day i has hr = 60 + i, hrv = 50 - i, 100 * (i + 1) steps per hour, sleep 23:00 -> 07:00.
    """
    with get_session() as s:
        for i in range(DAYS):
            day = START + timedelta(days=i)
            repo.insert_heart_samples(
                s,
                [
                    {"user_id": user_id, "ts": _at(day, h), "hr_bpm": 60.0 + i,
                     "hrv_rmssd_ms": 50.0 - i, "source": "simulator:test"}
                    for h in range(24)
                ],
            )
            repo.insert_activity_samples(
                s,
                [
                    {"user_id": user_id, "ts": _at(day, h), "steps": 100 * (i + 1),
                     "active_minutes": 1.0, "screen_time_min": 5.0, "source": "simulator:test"}
                    for h in range(24)
                ],
            )
            repo.insert_sleep_session(
                s, user_id, _at(day - timedelta(days=1), 23), _at(day, 7),
                efficiency=0.9, stages={"deep": 90}, source="simulator:test",
            )
            repo.record_mood(s, user_id, score=3 + (i % 2), ts=_at(day, 20))
    return user_id


def test_hypertables_exist():
    with get_session() as s:
        names = set(
            s.execute(
                text("SELECT hypertable_name FROM timescaledb_information.hypertables")
            ).scalars()
        )
    assert {"heart_samples", "activity_samples"} <= names


def test_daily_metrics(seeded):
    with get_session() as s:
        rows = repo.daily_metrics(s, seeded, START, START + timedelta(days=DAYS - 1))

    assert len(rows) == DAYS
    first, last = rows[0], rows[-1]
    assert first["day"] == START
    assert first["hr_avg"] == pytest.approx(60.0)
    assert last["hrv_rmssd_avg"] == pytest.approx(50.0 - (DAYS - 1))
    assert first["steps"] == 100 * 24
    assert first["screen_time_min"] == pytest.approx(5.0 * 24)
    assert first["sleep_duration_min"] == pytest.approx(8 * 60)
    assert first["bedtime_hour"] == pytest.approx(23.0)
    assert first["wake_hour"] == pytest.approx(7.0)
    assert first["mood_avg"] == pytest.approx(3.0)


def test_upsert_overwrites_same_timestamp(user_id):
    ts = _at(START, 12)
    with get_session() as s:
        repo.insert_heart_samples(s, [{"user_id": user_id, "ts": ts, "hr_bpm": 70.0, "hrv_rmssd_ms": 40.0}])
        repo.insert_heart_samples(s, [{"user_id": user_id, "ts": ts, "hr_bpm": 80.0, "hrv_rmssd_ms": 30.0}])
        hr = s.execute(
            text("SELECT hr_bpm FROM heart_samples WHERE user_id = :u"), {"u": user_id}
        ).scalars().all()
    assert hr == [80.0]


def test_rolling_baseline_excludes_target_day(seeded):
    target = START + timedelta(days=DAYS - 1)  # 14 prior days: i = 0..13
    with get_session() as s:
        baseline = repo.rolling_baseline(s, seeded, target, window=14)

    assert baseline["hr_avg"] == pytest.approx(60.0 + sum(range(14)) / 14)
    assert baseline["steps"] == pytest.approx(100 * 24 * sum(range(1, 15)) / 14)
    assert baseline["sleep_duration_min"] == pytest.approx(480.0)
    assert baseline["mood_avg"] == pytest.approx(3.5)


def test_delete_source_data(seeded):
    with get_session() as s:
        repo.delete_source_data(s, seeded, "simulator:")
    with get_session() as s:
        rows = repo.daily_metrics(s, seeded, START, START + timedelta(days=DAYS - 1))
    assert all(r["hr_avg"] is None and r["steps"] is None for r in rows)
    assert all(r["mood_avg"] is not None for r in rows)  # mood is user input, not simulated


def test_constraints_reject_bad_input(user_id):
    with pytest.raises(Exception):
        with get_session() as s:
            repo.record_mood(s, user_id, score=9)
    with pytest.raises(Exception):
        with get_session() as s:
            repo.insert_sleep_session(s, user_id, _at(START, 8), _at(START, 7))
