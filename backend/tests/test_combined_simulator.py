"""Combined simulator: scenario matching on its own, and the simulate endpoint against the DB."""

import uuid
from datetime import UTC, date, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.api.main import app
from app.db import get_session
from app.simulators import combined

client = TestClient(app)

END = date(2026, 10, 21)


@pytest.fixture
def user_id():
    r = client.post("/users", json={"display_name": "combined-test-user"})
    uid = uuid.UUID(r.json()["id"])
    yield uid
    with get_session() as s:
        s.execute(text("DELETE FROM users WHERE id = :u"), {"u": uid})


def heart_rows(user_id):
    with get_session() as s:
        return s.scalar(
            text("SELECT count(*) FROM heart_samples WHERE user_id = :u"), {"u": user_id}
        )


def test_shared_scenario_is_used_everywhere():
    assert combined.scenarios_for("stress_period") == dict.fromkeys(
        combined.SIGNALS, "stress_period"
    )


def test_missing_scenarios_fall_back_to_closest_match_or_default():
    assert combined.scenarios_for("sudden_drop") == {
        "sleep": "short_night",
        "heart": "sudden_drop",
        "activity": "sudden_drop",
        "screen": "sudden_drop",
        "mood": "sudden_drop",
        "journal": "sudden_drop",
    }
    assert combined.scenarios_for("crisis") == {
        "sleep": "stable_average",
        "heart": "stable_average",
        "activity": "stable_average",
        "screen": "stable_average",
        "mood": "crisis",
        "journal": "crisis",
    }
    good = combined.scenarios_for("stable_good")
    assert good["heart"] == "stable_high"
    assert good["journal"] == "stable_positive"


def test_overrides_and_unknown_names():
    assert combined.scenarios_for("stress_period", {"journal": "crisis"})["journal"] == "crisis"
    with pytest.raises(ValueError, match="unknown scenario"):
        combined.scenarios_for("nope")
    with pytest.raises(ValueError, match="has no scenario"):
        combined.scenarios_for("stress_period", {"sleep": "crisis"})


def test_list_scenarios():
    body = client.get("/simulators").json()
    assert "stress_period" in body["scenarios"]
    assert body["signals"]["sleep"][0] == "stable_good"
    assert set(body["signals"]) == set(combined.SIGNALS)


def test_simulate_all_signals_then_infer(user_id):
    body = {"scenario": "stress_period", "days": 21, "end": str(END), "seed": 1}
    r = client.post(f"/users/{user_id}/simulate", json=body)
    assert r.status_code == 200, r.text
    run = r.json()
    assert run["start"] == str(END - timedelta(days=20))
    assert run["seed"] == 1
    assert run["scenarios"] == dict.fromkeys(combined.SIGNALS, "stress_period")
    assert set(run["rows"]) == set(combined.SIGNALS)
    assert all(n > 0 for n in run["rows"].values())
    assert {a["kind"] for a in run["anomalies"]} >= {"stress"}
    assert all(s["day"] == str(END) for s in run["suggestions"])

    moods = client.get(
        f"/users/{user_id}/mood", params={"start": run["start"], "end": run["end"]}
    ).json()
    assert len(moods) > 0

    # a rerun with the same seed replaces the rows with the same ones
    n = heart_rows(user_id)
    again = client.post(f"/users/{user_id}/simulate", json=body).json()
    assert again["rows"] == run["rows"]
    assert heart_rows(user_id) == n == run["rows"]["heart"]


def test_simulate_some_signals_without_inference(user_id):
    body = {"scenario": "withdrawal", "days": 7, "signals": ["mood"], "infer": False}
    run = client.post(f"/users/{user_id}/simulate", json=body).json()
    assert list(run["rows"]) == ["mood"]
    assert run["scenarios"] == {"mood": "withdrawal"}
    assert run["end"] == str(datetime.now(UTC).date())
    assert isinstance(run["seed"], int)
    assert run["anomalies"] == run["suggestions"] == []
    assert heart_rows(user_id) == 0


@pytest.mark.parametrize(
    "body",
    [
        {"scenario": "nope"},
        {"scenarios": {"sleep": "crisis"}},
        {"signals": ["nope"]},
        {"signals": []},
        {"days": 0},
        {"days": 91},
    ],
)
def test_invalid_simulation_is_422(user_id, body):
    assert client.post(f"/users/{user_id}/simulate", json=body).status_code == 422


def test_simulate_unknown_user_is_404():
    assert client.post(f"/users/{uuid.uuid4()}/simulate", json={}).status_code == 404
