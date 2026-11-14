"""Anomaly detection. Rule tests use hand-made daily rows around a steady user; integration
tests run the simulators into the containerized DB: docker compose run --rm migrate pytest"""

from datetime import date, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import text

from app.db import get_session
from app.db import repository as repo
from app.inference import anomalies as an
from app.simulators import activity, hrv, sleep

START = date(2026, 10, 1)
TODAY = date(2026, 11, 14)


def steady(n=21, start=START):
    """A steady user: small day-to-day wobble around HR 60, HRV 50, 8 h sleep, 8000 steps."""
    rows = []
    for i in range(n):
        w = (i % 3) - 1  # -1, 0, 1
        rows.append(
            {
                "day": start + timedelta(days=i),
                "hr_avg": 60.0 + w,
                "hr_min": 50.0,
                "hrv_rmssd_avg": 50.0 + 2 * w,
                "steps": 8000 + 300 * w,
                "active_minutes": 25.0,
                "screen_time_min": 0.0,
                "sleep_duration_min": 480.0 + 10 * w,
                "bedtime_hour": 23.0 + 0.1 * w,
                "wake_hour": 7.0 + 0.1 * w,
                "mood_avg": 4.0,
            }
        )
    return rows


def find(rows, start=None, end=None, today=TODAY):
    start = start or rows[0]["day"]
    end = end or rows[-1]["day"]
    return an.find(rows, start, end, today=today)


def kinds(found):
    return [(a["day"], a["kind"], a["severity"]) for a in found]


def stress(row):
    row.update(hrv_rmssd_avg=30.0, hr_avg=70.0)


def test_steady_user_has_no_anomalies():
    assert find(steady()) == []


def test_stress_day_is_one_anomaly_with_both_signals():
    rows = steady()
    stress(rows[16])
    (a,) = find(rows)
    assert (a["day"], a["kind"], a["severity"]) == (rows[16]["day"], "stress", "attention")
    signals = a["explanation"]["signals"]
    assert [s["metric"] for s in signals] == ["hrv_rmssd_avg", "hr_avg"]
    top = max(signals, key=lambda s: abs(s["z"]))
    assert (a["metric"], a["value"], a["baseline"]) == (
        top["metric"],
        top["value"],
        top["baseline"],
    )
    assert a["explanation"]["summary"].startswith("HRV 30 ms vs usual 50 ms (-40 %)")
    assert a["explanation"]["escalation"] == []


def test_small_changes_do_not_fire_even_for_a_steady_user():
    rows = steady()
    rows[16].update(hr_avg=65.0, sleep_duration_min=420.0, mood_avg=3.5, steps=5500)
    assert find(rows) == []


def test_needs_a_baseline_of_seven_days():
    rows = steady(8)
    stress(rows[6])  # 6 days before it
    stress(rows[7])  # 7 days before it, one of them already stressed
    assert kinds(find(rows)) == [(rows[7]["day"], "stress", "attention")]


def test_missing_days_do_not_count_toward_the_baseline():
    rows = steady(16)
    for r in rows[2:10]:
        r["hrv_rmssd_avg"] = r["hr_avg"] = None
    stress(rows[15])
    assert find(rows) == []  # only 6 days with heart data before day 15


def test_today_skips_heart_and_activity_but_judges_sleep_and_mood():
    rows = steady()
    last = rows[-1]
    stress(last)
    last.update(steps=1000, sleep_duration_min=300.0, mood_avg=2.0)
    today = last["day"]
    assert [a["kind"] for a in find(rows, today=today)] == ["short_sleep", "low_mood"]
    assert {a["kind"] for a in find(rows, today=today + timedelta(days=1))} == {
        "stress",
        "short_sleep",
        "low_activity",
        "low_mood",
    }


def test_days_after_today_are_not_judged():
    rows = steady()
    rows[-1]["sleep_duration_min"] = 300.0
    assert find(rows, today=rows[-2]["day"]) == []


def test_sustained_stress_becomes_critical():
    rows = steady()
    for r in rows[14:17]:
        stress(r)
    found = find(rows)
    assert [a["severity"] for a in found] == ["attention", "attention", "critical"]
    assert found[-1]["explanation"]["escalation"] == ["sustained"]


def test_sustained_counts_days_before_the_range():
    rows = steady()
    for r in rows[14:17]:
        stress(r)
    (a,) = find(rows, start=rows[16]["day"])
    assert a["severity"] == "critical"


def test_robust_baseline_keeps_flagging_a_long_stress_period():
    rows = steady()
    for r in rows[14:21]:
        stress(r)
    found = find(rows, start=rows[20]["day"])
    assert kinds(found) == [(rows[20]["day"], "stress", "critical")]  # 6 of 14 days stressed


def test_several_kinds_at_once_are_critical():
    rows = steady()
    stress(rows[16])
    rows[16].update(sleep_duration_min=330.0, steps=4000)
    found = find(rows)
    assert [a["kind"] for a in found] == ["stress", "short_sleep", "low_activity"]
    assert all(a["severity"] == "critical" for a in found)
    assert all(a["explanation"]["escalation"] == ["multiple_signals"] for a in found)


def test_extreme_deviation_is_critical():
    rows = steady()
    rows[16]["steps"] = 800
    (a,) = find(rows)
    assert (a["kind"], a["severity"]) == ("low_activity", "critical")
    assert a["explanation"]["escalation"] == ["extreme"]
    assert a["explanation"]["summary"] == "steps 800 vs usual 8,000 (-90 %)"


@pytest.mark.parametrize(
    ("change", "kind", "summary"),
    [
        ({"sleep_duration_min": 600.0}, "long_sleep", "sleep 10 h 00 min vs usual 8 h 00 min"),
        ({"bedtime_hour": 25.5}, "sleep_shift", "bedtime 01:30 vs usual 23:00 (+2.5 h)"),
        ({"wake_hour": 9.0}, "sleep_shift", "wake time 09:00 vs usual 07:00 (+2.0 h)"),
        ({"screen_time_min": 120.0}, "screen_time", "screen time 2 h 00 min vs usual"),
        ({"mood_avg": 2.0}, "low_mood", "mood 2.0/5 vs usual 4.0/5 (-2.0)"),
    ],
)
def test_each_rule_fires_with_an_explanation(change, kind, summary):
    rows = steady()
    rows[16].update(change)
    (a,) = find(rows)
    assert a["kind"] == kind
    assert a["explanation"]["summary"].startswith(summary)


def test_accepts_decimal_metrics():
    rows = steady()
    for r in rows:
        r["bedtime_hour"] = Decimal(str(r["bedtime_hour"]))
    rows[16]["bedtime_hour"] = Decimal("25.5")
    (a,) = find(rows)
    assert a["value"] == 25.5 and isinstance(a["baseline"], float)


# --- DB integration ------------------------------------------------------------------

DAYS = 21
END = START + timedelta(days=DAYS - 1)


@pytest.fixture
def user_id():
    with get_session() as s:
        uid = repo.create_user(s, "anomaly-test")
    yield uid
    with get_session() as s:
        s.execute(text("DELETE FROM users WHERE id = :u"), {"u": uid})


def simulate(user_id, sleep_scenario, hrv_scenario, activity_scenario, seed=1):
    with get_session() as s:
        nights = sleep.nights(START, DAYS, sleep_scenario, seed=seed)
        sleep.simulate(s, user_id, START, DAYS, sleep_scenario, seed=seed)
        hrv.simulate(s, user_id, START, DAYS, hrv_scenario, seed=seed, nights=nights)
        activity.simulate(s, user_id, START, DAYS, activity_scenario, seed=seed, nights=nights)


def detect(user_id):
    with get_session() as s:
        return an.detect(s, user_id, START, END, today=TODAY)


@pytest.mark.parametrize("seed", range(3))
def test_stable_simulated_user_has_no_anomalies(user_id, seed):
    simulate(user_id, "stable_average", "stable_average", "stable_average", seed=seed)
    assert detect(user_id) == []


def test_simulated_stress_period_is_found_and_stored(user_id):
    simulate(user_id, "stress_period", "stress_period", "stress_period")
    found = detect(user_id)
    stress_days = {(a.day - START).days for a in found if a.kind == "stress"}
    hold = set(range(9, 15))  # onset on days 7-8, hold on days 9-14, recovery on days 15-17
    assert len(hold & stress_days) >= 5
    assert all(7 <= d <= 17 for d in stress_days)  # nothing in the normal days around it
    assert any(a.severity == "critical" for a in found)
    with get_session() as s:
        stored = repo.anomalies(s, user_id, START, END)
    assert [(a.id, a.day, a.kind, a.severity) for a in stored] == [
        (a.id, a.day, a.kind, a.severity) for a in found
    ]


def test_simulated_sudden_drop_is_critical_on_the_day(user_id):
    simulate(user_id, "short_night", "sudden_drop", "sudden_drop")
    drop = START + timedelta(days=DAYS // 2)
    on_drop = {a.kind: a.severity for a in detect(user_id) if a.day == drop}
    assert {"stress", "short_sleep", "low_activity"} <= on_drop.keys()
    assert set(on_drop.values()) == {"critical"}


def test_rerun_keeps_ids_and_drops_what_no_longer_fires(user_id):
    simulate(user_id, "stress_period", "stress_period", "stress_period")
    first = detect(user_id)
    second = detect(user_id)
    assert [(a.id, a.day, a.kind) for a in first] == [(a.id, a.day, a.kind) for a in second]

    with get_session() as s:
        repo.delete_source_data(s, user_id, hrv.SOURCE_PREFIX)
    third = detect(user_id)
    assert not any(a.kind == "stress" for a in third)
    kept = {(a.day, a.kind): a.id for a in second}
    assert all(kept[(a.day, a.kind)] == a.id for a in third)
    with get_session() as s:
        assert len(repo.anomalies(s, user_id, START, END)) == len(third)


def test_cli_prints_and_stores(user_id, capsys):
    simulate(user_id, "stress_period", "stress_period", "stress_period")
    an.main(["--user", str(user_id), "--end", END.isoformat(), "--days", str(DAYS)])
    out = capsys.readouterr().out
    assert "stress" in out and "HRV" in out
    with get_session() as s:
        assert repo.anomalies(s, user_id, START, END)
