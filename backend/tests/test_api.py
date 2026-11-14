"""API tests against the containerized DB: docker compose run --rm migrate pytest"""

import uuid
from datetime import UTC, date, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.api.main import app
from app.db import get_session
from app.db import repository as repo
from app.simulators import hrv, journal

client = TestClient(app)

START = date(2026, 10, 1)
DAYS = 15


def _at(day: date, hour: int, minute: int = 0) -> datetime:
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=UTC)


@pytest.fixture
def user_id():
    r = client.post("/users", json={"display_name": "api-test-user"})
    assert r.status_code == 201
    uid = uuid.UUID(r.json()["id"])
    yield uid
    with get_session() as s:
        s.execute(text("DELETE FROM users WHERE id = :u"), {"u": uid})


@pytest.fixture
def seeded(user_id):
    """Day i: hourly hr = 60 + i, 100 steps per hour, sleep 23:00 -> 07:00."""
    with get_session() as s:
        for i in range(DAYS):
            day = START + timedelta(days=i)
            repo.insert_heart_samples(
                s,
                [
                    {"user_id": user_id, "ts": _at(day, h), "hr_bpm": 60.0 + i, "hrv_rmssd_ms": 50}
                    for h in range(24)
                ],
            )
            repo.insert_activity_samples(
                s,
                [
                    {"user_id": user_id, "ts": _at(day, h), "steps": 100, "active_minutes": 1.0}
                    for h in range(24)
                ],
            )
            repo.insert_sleep_session(
                s,
                user_id,
                _at(day - timedelta(days=1), 23),
                _at(day, 7),
                efficiency=0.9,
                stages={"deep": 90, "rem": 100, "light": 260, "awake": 30},
            )
    return user_id


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_create_get_and_list_users(user_id):
    r = client.get(f"/users/{user_id}")
    assert r.status_code == 200
    body = r.json()
    assert body["display_name"] == "api-test-user"
    assert body["timezone"] == "Europe/Helsinki"
    assert str(user_id) in {u["id"] for u in client.get("/users").json()}


def test_unknown_user_is_404():
    for path in ("", "/daily", "/today", "/mood", "/sleep", "/journal", "/anomalies"):
        assert client.get(f"/users/{uuid.uuid4()}{path}").status_code == 404
    assert client.post(f"/users/{uuid.uuid4()}/anomalies/detect").status_code == 404


def test_invalid_user_body_is_422():
    assert client.post("/users", json={"display_name": ""}).status_code == 422


def test_record_and_list_mood(user_id):
    r = client.post(
        f"/users/{user_id}/mood", json={"score": 4, "note": "ok day", "ts": "2026-10-03T20:00:00"}
    )
    assert r.status_code == 201
    created = r.json()
    assert created["score"] == 4
    assert created["note"] == "ok day"
    assert created["source"] == "app"
    assert datetime.fromisoformat(created["ts"]) == _at(date(2026, 10, 3), 20)  # naive -> UTC

    moods = client.get(
        f"/users/{user_id}/mood", params={"start": "2026-10-01", "end": "2026-10-05"}
    ).json()
    assert [m["id"] for m in moods] == [created["id"]]

    daily = client.get(
        f"/users/{user_id}/daily", params={"start": "2026-10-03", "end": "2026-10-03"}
    ).json()
    assert daily[0]["mood_avg"] == pytest.approx(4.0)


@pytest.mark.parametrize("score", [0, 6])
def test_mood_score_out_of_range_is_422(user_id, score):
    assert client.post(f"/users/{user_id}/mood", json={"score": score}).status_code == 422


def test_mood_defaults_to_today(user_id):
    assert client.post(f"/users/{user_id}/mood", json={"score": 2}).status_code == 201
    today = client.get(f"/users/{user_id}/today").json()
    assert today["mood_logged"] is True
    assert today["metrics"]["mood_avg"] == pytest.approx(2.0)


def test_record_and_list_journal(user_id):
    r = client.post(
        f"/users/{user_id}/journal",
        json={"text": "Hyvä päivä, kävin kävelyllä.", "language": "fi", "ts": "2026-10-03T21:00"},
    )
    assert r.status_code == 201
    created = r.json()
    assert created["text"] == "Hyvä päivä, kävin kävelyllä."
    assert created["language"] == "fi"
    assert created["source"] == "app"
    assert created["expected_label"] is None and created["expected_risk"] is None
    assert datetime.fromisoformat(created["ts"]) == _at(date(2026, 10, 3), 21)

    assert client.post(f"/users/{user_id}/journal", json={"text": "no language"}).status_code == 201
    entries = client.get(
        f"/users/{user_id}/journal", params={"start": "2026-10-01", "end": "2026-10-05"}
    ).json()
    assert [e["id"] for e in entries] == [created["id"]]


def test_journal_lists_simulated_ground_truth(user_id):
    with get_session() as s:
        journal.simulate(s, user_id, START, 9, "isolated_risk", seed=1)
    entries = client.get(
        f"/users/{user_id}/journal", params={"start": str(START), "end": str(START + timedelta(8))}
    ).json()
    assert entries
    assert {e["source"] for e in entries} == {"simulator:journal:isolated_risk"}
    assert sum(e["expected_risk"] != "none" for e in entries) == 1


@pytest.mark.parametrize(
    "body", [{"text": ""}, {"text": "x" * 5001}, {"text": "ok", "language": "sv"}, {}]
)
def test_invalid_journal_body_is_422(user_id, body):
    assert client.post(f"/users/{user_id}/journal", json=body).status_code == 422


def test_daily(seeded):
    end = START + timedelta(days=DAYS - 1)
    r = client.get(f"/users/{seeded}/daily", params={"start": str(START), "end": str(end)})
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == DAYS
    assert rows[0]["day"] == str(START)
    assert rows[0]["hr_avg"] == pytest.approx(60.0)
    assert rows[0]["steps"] == 2400
    assert rows[0]["sleep_duration_min"] == pytest.approx(480.0)
    assert rows[0]["bedtime_hour"] == pytest.approx(23.0)
    assert rows[0]["mood_avg"] is None


def test_daily_defaults_to_last_14_days(user_id):
    rows = client.get(f"/users/{user_id}/daily").json()
    assert len(rows) == 14
    assert rows[-1]["day"] == str(datetime.now(UTC).date())


@pytest.mark.parametrize(
    "params",
    [
        {"start": "2026-10-05", "end": "2026-10-01"},
        {"start": "2024-01-01", "end": "2026-10-01"},
        {"start": "not-a-date"},
    ],
)
def test_daily_rejects_bad_ranges(user_id, params):
    assert client.get(f"/users/{user_id}/daily", params=params).status_code == 422


def test_baseline(seeded):
    target = START + timedelta(days=DAYS - 1)
    r = client.get(f"/users/{seeded}/baseline", params={"day": str(target), "window": 14})
    assert r.status_code == 200
    body = r.json()
    assert body["day"] == str(target)
    assert body["window"] == 14
    assert body["hr_avg"] == pytest.approx(60.0 + sum(range(14)) / 14)
    assert body["mood_avg"] is None


def test_today_shape(user_id):
    body = client.get(f"/users/{user_id}/today").json()
    assert body["day"] == str(datetime.now(UTC).date())
    assert body["metrics"]["day"] == body["day"]
    assert body["baseline"]["window"] == 14
    assert body["mood_logged"] is False
    assert body["anomalies"] == []


def test_heart_and_activity_samples(seeded):
    params = {"start": "2026-10-02T00:00:00Z", "end": "2026-10-02T03:00:00Z"}
    heart = client.get(f"/users/{seeded}/heart", params=params).json()
    assert [h["ts"][11:16] for h in heart] == ["00:00", "01:00", "02:00"]  # end is exclusive
    assert heart[0]["hr_bpm"] == pytest.approx(61.0)
    assert heart[0]["source"] == "device"

    activity = client.get(f"/users/{seeded}/activity", params=params).json()
    assert len(activity) == 3
    assert activity[0]["steps"] == 100
    assert "screen_time_min" not in activity[0]


def test_screen_samples(user_id):
    with get_session() as s:
        repo.insert_screen_samples(
            s,
            [
                {"user_id": user_id, "ts": _at(START, h), "screen_time_min": float(h)}
                for h in range(24)
            ],
        )
    params = {"start": "2026-10-01T20:00:00Z", "end": "2026-10-02T00:00:00Z"}
    samples = client.get(f"/users/{user_id}/screen", params=params).json()
    assert [(x["ts"][11:16], x["screen_time_min"]) for x in samples] == [
        ("20:00", 20.0),
        ("21:00", 21.0),
        ("22:00", 22.0),
        ("23:00", 23.0),
    ]
    assert samples[0]["source"] == "device"
    day = {"start": "2026-10-01", "end": "2026-10-01"}
    daily = client.get(f"/users/{user_id}/daily", params=day).json()
    assert daily[0]["screen_time_min"] == sum(range(24))


def test_samples_range_is_limited(user_id):
    params = {"start": "2026-09-01T00:00:00Z", "end": "2026-10-15T00:00:00Z"}
    assert client.get(f"/users/{user_id}/heart", params=params).status_code == 422


def test_sleep_by_wake_day(seeded):
    r = client.get(f"/users/{seeded}/sleep", params={"start": "2026-10-02", "end": "2026-10-03"})
    sessions = r.json()
    assert [s["wake_time"][:10] for s in sessions] == ["2026-10-02", "2026-10-03"]
    assert sessions[0]["duration_min"] == 480
    assert sessions[0]["efficiency"] == pytest.approx(0.9)
    assert sessions[0]["stages"]["deep"] == 90


def test_detect_and_list_anomalies(user_id):
    with get_session() as s:
        hrv.simulate(s, user_id, START, 21, "stress_period", seed=1)
    params = {"start": str(START + timedelta(days=7)), "end": str(START + timedelta(days=20))}
    assert client.get(f"/users/{user_id}/anomalies", params=params).json() == []

    r = client.post(f"/users/{user_id}/anomalies/detect", params=params)
    assert r.status_code == 200
    found = r.json()
    assert {a["kind"] for a in found} == {"stress"}
    first = found[0]
    assert first["severity"] in ("attention", "critical")
    assert first["metric"] in ("hrv_rmssd_avg", "hr_avg")
    assert first["explanation"]["summary"]
    assert any(a["severity"] == "critical" for a in found)

    listed = client.get(f"/users/{user_id}/anomalies", params=params).json()
    assert listed == found
    again = client.post(f"/users/{user_id}/anomalies/detect", params=params).json()
    assert [a["id"] for a in again] == [a["id"] for a in found]


def test_today_lists_yesterdays_and_todays_anomalies(user_id):
    today = datetime.now(UTC).date()
    with get_session() as s:
        for i in range(15):
            day = today - timedelta(days=14 - i)
            repo.record_mood(s, user_id, score=2 if day == today else 4, ts=_at(day, 20))
    client.post(f"/users/{user_id}/anomalies/detect")
    body = client.get(f"/users/{user_id}/today").json()
    assert [(a["day"], a["kind"]) for a in body["anomalies"]] == [(str(today), "low_mood")]


def test_api_key_open_when_unset(monkeypatch):
    monkeypatch.delenv("API_KEY", raising=False)
    assert client.get("/health").status_code == 200


def test_api_key_required_when_set(monkeypatch):
    monkeypatch.setenv("API_KEY", "s3cret")
    assert client.get("/health").status_code == 401
    assert client.get("/users", headers={"X-API-Key": "wrong"}).status_code == 401
    assert client.get("/health", headers={"X-API-Key": "s3cret"}).status_code == 200
    # The docs stay reachable so the schema can be browsed; their routes have no dependencies.
    assert client.get("/openapi.json").status_code == 200
