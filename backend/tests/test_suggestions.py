"""Suggestions engine: `choose` is tested on hand-made anomalies and history, `suggest` and the
API against the database."""

import uuid
from datetime import UTC, date, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.api.main import app
from app.db import get_session
from app.db import repository as repo
from app.inference import anomalies as an
from app.inference import suggestions as sg
from app.simulators import activity, hrv, screen, sleep
from app.simulators import mood as mood_sim

client = TestClient(app)

DAY = date(2026, 10, 20)
TODAY = date(2026, 11, 14)


def anomaly(kind, severity="attention", *, id=1, day=DAY, escalation=(), metric=None):
    return {
        "id": id,
        "day": day,
        "kind": kind,
        "severity": severity,
        "metric": metric,
        "explanation": {"summary": f"{kind} summary", "escalation": list(escalation)},
    }


def shown(kind, day, *, anomaly_id=None, done=None, helped=None):
    return {"day": day, "kind": kind, "anomaly_id": anomaly_id, "done": done, "helped": helped}


def kinds(rows):
    return [r["kind"] for r in rows]


def test_every_practice_is_in_the_catalog_and_every_kind_has_some():
    assert set(sg.FOR_KIND) == set(an.KINDS)
    for practices in sg.FOR_KIND.values():
        assert practices and set(practices) <= set(sg.CATALOG)
    assert {sg.SUPPORT, sg.CRISIS} <= set(sg.CATALOG)


def test_an_anomaly_gets_its_best_practices():
    out = sg.choose([anomaly("stress")], [], DAY)
    assert kinds(out) == ["box_breathing", "physiological_sigh", "slow_walk"]
    assert out[0] == {
        "day": DAY,
        "kind": "box_breathing",
        "anomaly_id": 1,
        "reason": "stress summary",
    }


def test_no_anomalies_no_suggestions():
    assert sg.choose([], [], DAY) == []


def test_several_signals_at_once_get_a_friend_first():
    out = sg.choose([anomaly("stress", "critical", escalation=["multiple_signals"])], [], DAY)
    assert kinds(out) == ["message_friend", "box_breathing", "physiological_sigh"]


def test_critical_low_mood_gets_a_friend_first_but_not_every_day():
    a = anomaly("low_mood", "critical", escalation=["extreme"])
    assert kinds(sg.choose([a], [], DAY))[0] == "message_friend"
    history = [shown("message_friend", DAY - timedelta(days=1))]
    assert "message_friend" not in kinds(sg.choose([a], history, DAY))


def test_only_sustained_or_extreme_gets_no_support():
    for escalation in (["sustained"], ["extreme"]):
        out = sg.choose([anomaly("stress", "critical", escalation=escalation)], [], DAY)
        assert kinds(out) == ["box_breathing", "physiological_sigh", "slow_walk"]


def test_late_wake_gets_daylight_not_a_wind_down():
    late_bed = anomaly("sleep_shift", metric="bedtime_hour")
    late_wake = anomaly("sleep_shift", metric="wake_hour")
    assert kinds(sg.choose([late_bed], [], DAY))[0] == "wind_down"
    assert kinds(sg.choose([late_wake], [], DAY)) == list(sg.LATE_WAKE)


def test_very_low_mood_gets_crisis_support_first():
    a = anomaly("low_mood", "critical", escalation=["very_low"])
    out = sg.choose([a], [], DAY)
    assert kinds(out) == ["crisis_support", "nature_walk", "message_friend"]
    assert "112" in sg.CATALOG["crisis_support"].text


def test_anomalies_take_turns_critical_first():
    found = [
        anomaly("stress", id=1),
        anomaly("short_sleep", "critical", id=2, escalation=["multiple_signals"]),
    ]
    out = sg.choose(found, [], DAY)
    assert [(r["kind"], r["anomaly_id"]) for r in out] == [
        ("message_friend", 2),
        ("box_breathing", 1),
        ("wind_down", 2),
    ]


def test_a_kind_that_fired_both_days_counts_once_as_todays():
    yesterday = anomaly("low_mood", "critical", id=1, day=DAY - timedelta(days=1))
    out = sg.choose([yesterday, anomaly("low_mood", id=2)], [], DAY)
    assert {r["anomaly_id"] for r in out} == {2}
    assert kinds(out) == ["nature_walk", "message_friend", "journal"]  # no support: not critical


def test_todays_anomalies_before_yesterdays():
    found = [anomaly("stress", id=1, day=DAY - timedelta(days=1)), anomaly("low_activity", id=2)]
    assert kinds(sg.choose(found, [], DAY, limit=2)) == ["slow_walk", "box_breathing"]


def test_a_practice_is_suggested_once_a_day():
    found = [anomaly("low_activity", id=1), anomaly("low_mood", id=2)]
    out = sg.choose(found, [], DAY)
    # slow_walk for low_activity, nature_walk for low_mood, then low_activity's next one
    # (nature_walk) is taken, so mat_stretch
    assert kinds(out) == ["slow_walk", "nature_walk", "mat_stretch"]


def test_making_them_again_only_adds_for_new_anomalies():
    first = sg.choose([anomaly("stress", id=1)], [], DAY, limit=2)
    history = [shown(r["kind"], DAY, anomaly_id=r["anomaly_id"]) for r in first]
    assert sg.choose([anomaly("stress", id=1)], history, DAY) == []  # covered
    found = [anomaly("stress", id=1), anomaly("screen_time", id=2)]
    assert kinds(sg.choose(found, history, DAY)) == ["phone_free_hour"]  # room for one more


def test_yesterdays_covered_anomaly_gets_only_its_support_again():
    yesterday = DAY - timedelta(days=1)
    a = anomaly("low_mood", "critical", id=1, day=yesterday, escalation=["very_low"])
    history = [shown("crisis_support", yesterday, anomaly_id=1)]
    assert kinds(sg.choose([a], history, DAY)) == ["crisis_support"]


def test_recent_practices_wait_their_turn():
    history = [shown("box_breathing", DAY - timedelta(days=1))]
    assert kinds(sg.choose([anomaly("stress")], history, DAY)) == [
        "physiological_sigh",
        "slow_walk",
        "body_scan",
    ]
    old = [shown("box_breathing", DAY - timedelta(days=sg.COOLDOWN_DAYS + 1))]
    assert kinds(sg.choose([anomaly("stress")], old, DAY))[0] == "box_breathing"


def test_recent_practices_still_come_when_nothing_else_fits():
    history = [shown(k, DAY - timedelta(days=1)) for k in sg.FOR_KIND["low_activity"]]
    assert kinds(sg.choose([anomaly("low_activity")], history, DAY)) == list(
        sg.FOR_KIND["low_activity"]
    )


def test_learns_what_helps_this_user():
    old = DAY - timedelta(days=10)
    helped = [shown("slow_walk", old, done=True, helped=True)] * 3
    assert kinds(sg.choose([anomaly("stress")], helped, DAY))[0] == "slow_walk"

    unhelpful = [shown("box_breathing", old, done=True, helped=False)] * 4
    assert kinds(sg.choose([anomaly("stress")], unhelpful, DAY)) == [
        "physiological_sigh",
        "slow_walk",
        "body_scan",
    ]


def test_preference():
    def fb(done, helped=None):
        return shown("journal", DAY, done=done, helped=helped)

    assert sg.preference("journal", []) == 0
    assert sg.preference("journal", [fb(None)]) == 0  # no answer yet
    assert sg.preference("journal", [fb(True)]) == 0  # done, didn't say
    assert sg.preference("journal", [fb(True, True)]) == pytest.approx(2 / 3 - 0.5)
    assert sg.preference("journal", [fb(True, False)]) == pytest.approx(1 / 3 - 0.5)
    assert sg.preference("journal", [fb(False)] * 2) == pytest.approx(1 / 3 - 0.5)  # skipped
    assert sg.preference("nature_walk", [fb(True, True)]) == 0  # other practices don't count


# --- DB and API ------------------------------------------------------------------------


@pytest.fixture
def user_id():
    with get_session() as s:
        uid = repo.create_user(s, "suggestions-test")
    yield uid
    with get_session() as s:
        s.execute(text("DELETE FROM users WHERE id = :u"), {"u": uid})


def record_moods(user_id, last_day, scores):
    """scores[i] on last_day - (len(scores) - 1 - i), at 20:00 UTC."""
    with get_session() as s:
        for i, score in enumerate(scores):
            day = last_day - timedelta(days=len(scores) - 1 - i)
            repo.record_mood(s, user_id, score, ts=datetime(*day.timetuple()[:3], 20, tzinfo=UTC))


def test_suggest_api_stores_once_and_records_feedback(user_id):
    record_moods(user_id, DAY, [4] * 14 + [1, 1, 1])  # very low for three days
    url = f"/users/{user_id}/suggestions"
    r = client.post(url, params={"day": str(DAY)})
    assert r.status_code == 200
    made = r.json()
    assert [m["kind"] for m in made] == ["crisis_support", "nature_walk", "message_friend"]
    first = made[0]
    assert first["day"] == str(DAY)
    assert first["title"] == "Talk to someone today"
    assert first["category"] == "support"
    assert (first["anomaly_kind"], first["severity"]) == ("low_mood", "critical")
    assert "mood 1.0/5" in first["reason"]
    assert first["done"] is None

    again = client.post(url, params={"day": str(DAY)}).json()
    assert [m["id"] for m in again] == [m["id"] for m in made]
    listed = client.get(url, params={"start": str(DAY), "end": str(DAY)}).json()
    assert listed == made

    walk = made[1]["id"]
    r = client.post(f"{url}/{walk}/feedback", json={"done": True, "helped": True})
    assert r.status_code == 201
    assert (r.json()["id"], r.json()["done"], r.json()["helped"]) == (walk, True, True)
    r = client.post(f"{url}/{walk}/feedback", json={"done": False})
    assert (r.json()["done"], r.json()["helped"]) == (False, None)  # the latest counts


def test_feedback_is_validated(user_id):
    record_moods(user_id, DAY, [4] * 14 + [1, 1, 1])
    url = f"/users/{user_id}/suggestions"
    sid = client.post(url, params={"day": str(DAY)}).json()[0]["id"]
    assert (
        client.post(f"{url}/{sid}/feedback", json={"done": False, "helped": True}).status_code
        == 422
    )
    assert client.post(f"{url}/{sid + 10**9}/feedback", json={"done": True}).status_code == 404
    other = client.post("/users", json={"display_name": "someone-else"}).json()["id"]
    try:
        r = client.post(f"/users/{other}/suggestions/{sid}/feedback", json={"done": True})
        assert r.status_code == 404  # not their suggestion
    finally:
        with get_session() as s:
            s.execute(text("DELETE FROM users WHERE id = :u"), {"u": other})
    assert client.get(f"/users/{uuid.uuid4()}/suggestions").status_code == 404
    assert client.post(f"/users/{uuid.uuid4()}/suggestions").status_code == 404


def test_suggestion_outlives_its_anomaly(user_id):
    record_moods(user_id, DAY, [4] * 14 + [1, 1, 1])
    with get_session() as s:
        made = sg.suggest(s, user_id, DAY, today=TODAY)
        s.execute(text("DELETE FROM mood_checkins WHERE user_id = :u"), {"u": user_id})
        an.detect(s, user_id, DAY - timedelta(days=1), DAY, today=TODAY)  # anomaly gone
        (kept, *_) = repo.suggestions(s, user_id, DAY, DAY)
    assert kept["id"] == made[0]["id"]
    assert kept["anomaly_id"] is None and kept["severity"] is None
    assert kept["reason"] == made[0]["reason"]


def test_today_lists_todays_suggestions(user_id):
    today = datetime.now(UTC).date()
    record_moods(user_id, today, [4] * 14 + [2])
    made = client.post(f"/users/{user_id}/suggestions").json()
    assert made and made[0]["anomaly_kind"] == "low_mood"
    assert client.get(f"/users/{user_id}/today").json()["suggestions"] == made


def test_simulated_stress_period_gets_stress_suggestions(user_id):
    start, days = date(2026, 10, 1), 21
    with get_session() as s:
        nights = sleep.nights(start, days, "stress_period", seed=1)
        sleep.simulate(s, user_id, start, days, "stress_period", seed=1)
        for sim in (hrv, activity, mood_sim, screen):
            sim.simulate(s, user_id, start, days, "stress_period", seed=1, nights=nights)
    with get_session() as s:
        for d in range(days):
            sg.suggest(s, user_id, start + timedelta(days=d), today=TODAY)
        rows = repo.suggestions(s, user_id, start, start + timedelta(days=days - 1))
    by_day = {}
    for r in rows:
        by_day.setdefault((r["day"] - start).days, []).append(r["kind"])
    assert by_day and all(7 <= d <= 18 for d in by_day)  # only around the stress period
    assert all(len(k) <= sg.MAX_PER_DAY and len(set(k)) == len(k) for k in by_day.values())
    assert "box_breathing" in {k for ks in by_day.values() for k in ks}


def test_stable_user_gets_no_suggestions(user_id):
    start, days = date(2026, 10, 1), 21
    with get_session() as s:
        nights = sleep.nights(start, days, seed=1)
        sleep.simulate(s, user_id, start, days, seed=1)
        for sim in (hrv, activity, mood_sim, screen):
            sim.simulate(s, user_id, start, days, "stable_average", seed=1, nights=nights)
        for d in range(days):
            assert sg.suggest(s, user_id, start + timedelta(days=d), today=TODAY) == []


def test_cli_prints_and_stores(user_id, capsys):
    record_moods(user_id, DAY, [4] * 14 + [1, 1, 1])
    sg.main(["--user", str(user_id), "--day", str(DAY)])
    out = capsys.readouterr().out
    assert "crisis_support" in out and "3 suggestions" in out
    with get_session() as s:
        assert len(repo.suggestions(s, user_id, DAY, DAY)) == 3
