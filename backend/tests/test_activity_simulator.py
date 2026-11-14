"""Activity simulator (#8). Shape tests compare against stable_average with the same seed, which
shares the exact same noise, so they check the scenario shape rather than luck of the draw."""

import statistics
import uuid
from collections import defaultdict
from datetime import date, timedelta

import pytest
from sqlalchemy import text

from app.db import get_session
from app.db import repository as repo
from app.simulators import activity, sleep

UID = uuid.UUID(int=0)
START = date(2026, 10, 1)  # a Thursday
DAYS = 21
SEED = 7


def gen(scenario="stable_average", **kw):
    kw.setdefault("seed", SEED)
    return activity.generate(UID, START, kw.pop("days", DAYS), scenario, **kw)


def daily(rows, field="steps"):
    by_day = defaultdict(int)
    for r in rows:
        by_day[r["ts"].date()] += r[field]
    return [by_day[START + timedelta(days=d)] for d in range(DAYS)]


def by_day(rows):
    out = defaultdict(list)
    for r in rows:
        out[r["ts"].date()].append({k: v for k, v in r.items() if k != "source"})
    return [out[START + timedelta(days=d)] for d in range(DAYS)]


def step_hour(rows):
    """Step-weighted mean hour of the day; hours before 04:00 count as the previous evening."""
    hours = [r["ts"].hour + r["ts"].minute / 60 for r in rows]
    hours = [h + 24 if h < 4 else h for h in hours]
    return sum(h * r["steps"] for h, r in zip(hours, rows, strict=True)) / sum(
        r["steps"] for r in rows
    )


def test_deterministic_rows_on_the_interval():
    rows = gen(seed=1)
    assert rows == gen(seed=1)
    assert rows != gen(seed=2)
    assert len(rows) == DAYS * 24 * 4
    assert all(r["ts"].minute % 15 == 0 and r["ts"].second == 0 for r in rows)
    assert {r["source"] for r in rows} == {"simulator:activity:stable_average"}
    hourly = gen(seed=1, interval_min=60)
    assert len(hourly) == DAYS * 24
    assert daily(hourly) == daily(rows)  # same minutes, summed differently


def test_rejects_bad_arguments():
    with pytest.raises(ValueError):
        gen("nope")
    with pytest.raises(ValueError):
        gen(days=0)
    with pytest.raises(ValueError):
        gen(interval_min=7)


@pytest.mark.parametrize("scenario", activity.SCENARIOS)
@pytest.mark.parametrize("seed", range(3))
def test_samples_are_consistent(scenario, seed):
    for r in gen(scenario, seed=seed, artifacts=True):
        assert isinstance(r["steps"], int) and r["steps"] >= 0
        assert isinstance(r["active_minutes"], int) and 0 <= r["active_minutes"] <= 15
        assert r["steps"] >= activity.ACTIVE_CADENCE * r["active_minutes"]


@pytest.mark.parametrize("seed", range(5))
def test_stable_levels_are_ordered_and_plausible(seed):
    lvls = ("active", "average", "sedentary")
    rows = {lvl: gen(f"stable_{lvl}", seed=seed) for lvl in lvls}
    steps = {lvl: statistics.fmean(daily(r)) for lvl, r in rows.items()}
    active = {lvl: statistics.fmean(daily(r, "active_minutes")) for lvl, r in rows.items()}
    assert 10_000 < steps["active"] < 14_000
    assert 6_000 < steps["average"] < 9_000
    assert 2_500 < steps["sedentary"] < 5_000
    assert active["active"] > active["average"] > active["sedentary"] > 0
    assert 15 < active["average"] < 40


def test_no_steps_while_asleep():
    for scenario in ("stable_average", "stable_active"):
        rows = gen(scenario)
        assert all(r["steps"] == 0 for r in rows if r["ts"].hour < 6)
        assert sum(r["steps"] for r in rows if r["ts"].hour == 23) == 0  # in bed from 23:00


def test_weekday_commute():
    rows = gen()
    weekend = [r for r in rows if r["ts"].weekday() >= 5 and r["ts"].hour == 8]
    weekday = [r for r in rows if r["ts"].weekday() < 5 and r["ts"].hour == 8]
    assert statistics.fmean(r["active_minutes"] for r in weekday) > 3 * statistics.fmean(
        r["active_minutes"] for r in weekend
    )


def test_follows_given_nights():
    nights = sleep.nights(START, DAYS, seed=SEED)
    late = [
        {
            **n,
            "bedtime": n["bedtime"] + timedelta(hours=3),
            "wake_time": n["wake_time"] + timedelta(hours=3),
        }
        for n in nights
    ]
    on_time, shifted = gen(nights=nights), gen(nights=late)
    assert step_hour(shifted) - step_hour(on_time) == pytest.approx(3, abs=0.5)
    for rows, sessions in ((on_time, nights), (shifted, late)):
        for n in sessions:
            assert not any(
                r["steps"]
                for r in rows
                if n["bedtime"] + timedelta(minutes=15) <= r["ts"]
                and r["ts"] + timedelta(minutes=15) <= n["wake_time"]
            )
    assert gen(nights=[]) != gen()  # no nights: awake around the clock


def test_late_sleep_shift_moves_the_day_later():
    rows, base = gen("late_sleep_shift"), gen()
    late_days = START + timedelta(days=DAYS - 5)
    first_days = START + timedelta(days=2)
    late = [step_hour([r for r in x if r["ts"].date() >= late_days]) for x in (rows, base)]
    first = [step_hour([r for r in x if r["ts"].date() < first_days]) for x in (rows, base)]
    assert late[0] - late[1] > 1.5  # wake is ~2.4 h later by the end
    assert first[0] - first[1] < 0.5


def test_stress_period_fewer_steps_then_recovers():
    rows, base = gen("stress_period"), gen()
    assert by_day(rows)[:7] == by_day(base)[:7]  # normal first third, same noise
    hold = range(9, 14)
    steps, base_steps = daily(rows), daily(base)
    assert sum(steps[d] for d in hold) < 0.8 * sum(base_steps[d] for d in hold)
    assert by_day(rows)[-1] == by_day(base)[-1]  # recovered


def test_withdrawal_declines_gradually():
    rows, base = gen("withdrawal"), gen()
    assert by_day(rows)[:7] == by_day(base)[:7]
    steps, base_steps = daily(rows), daily(base)
    assert sum(steps[-4:]) < 0.55 * sum(base_steps[-4:])
    ratio = [s / b for s, b in zip(steps, base_steps, strict=True)]
    assert statistics.fmean(ratio[8:12]) > statistics.fmean(ratio[-4:])
    assert sum(daily(rows, "active_minutes")[-4:]) < 0.3 * sum(daily(base, "active_minutes")[-4:])


def test_sudden_drop_then_recovers():
    rows, base = gen("sudden_drop"), gen()
    drop = DAYS // 2
    steps, base_steps = daily(rows), daily(base)
    assert by_day(rows)[:drop] == by_day(base)[:drop]
    assert steps[drop] < 0.35 * base_steps[drop]
    assert daily(rows, "active_minutes")[drop] == 0
    assert steps[drop + 1] < base_steps[drop + 1]
    assert sum(steps[-3:]) > 0.9 * sum(base_steps[-3:])


def test_oversleep_fewer_steps():
    rows, base = gen("oversleep"), gen()
    assert by_day(rows)[:8] == by_day(base)[:8]
    assert sum(daily(rows)[-5:]) < 0.85 * sum(daily(base)[-5:])


@pytest.mark.parametrize("seed", range(3))
def test_artifacts_drop_rows_only(seed):
    clean, noisy = gen(seed=seed), gen(artifacts=True, seed=seed)
    assert 0 < len(clean) - len(noisy) < 0.3 * len(clean)
    clean_set = {(r["ts"], r["steps"], r["active_minutes"]) for r in clean}
    assert all((r["ts"], r["steps"], r["active_minutes"]) in clean_set for r in noisy)


# --- DB integration ------------------------------------------------------------------


@pytest.fixture
def user_id():
    with get_session() as s:
        uid = repo.create_user(s, "activity-sim-test")
    yield uid
    with get_session() as s:
        s.execute(text("DELETE FROM users WHERE id = :u"), {"u": uid})


def test_simulate_writes_daily_metrics_and_replaces(user_id):
    end = START + timedelta(days=DAYS - 1)
    with get_session() as s:
        activity.simulate(s, user_id, START, DAYS, "stress_period", seed=SEED)
    with get_session() as s:
        n = activity.simulate(s, user_id, START, DAYS, "withdrawal", seed=SEED)
        count, sources = s.execute(
            text(
                "SELECT count(*), array_agg(DISTINCT source) FROM activity_samples"
                " WHERE user_id = :u"
            ),
            {"u": user_id},
        ).one()
        rows = repo.daily_metrics(s, user_id, START, end)
    assert count == n == DAYS * 96
    assert sources == ["simulator:activity:withdrawal"]
    expected = gen("withdrawal")
    assert [r["steps"] for r in rows] == daily(expected)
    assert [r["active_minutes"] for r in rows] == pytest.approx(daily(expected, "active_minutes"))
    assert all(r["screen_time_min"] == 0 for r in rows)

    with get_session() as s:
        repo.delete_source_data(s, user_id, activity.SOURCE_PREFIX)
        rows = repo.daily_metrics(s, user_id, START, end)
    assert all(r["steps"] is None for r in rows)


def test_sleep_cli_with_activity_writes_both(user_id):
    sleep.main(
        [
            "--user",
            str(user_id),
            "--scenario",
            "stress_period",
            "--start",
            START.isoformat(),
            "--days",
            "7",
            "--seed",
            "3",
            "--with-activity",
        ]
    )
    with get_session() as s:
        rows = repo.daily_metrics(s, user_id, START, START + timedelta(days=6))
        source = s.execute(
            text("SELECT DISTINCT source FROM activity_samples WHERE user_id = :u"),
            {"u": user_id},
        ).scalar_one()
    assert source == "simulator:activity:stress_period"
    assert all(r["sleep_duration_min"] is not None and r["steps"] > 0 for r in rows)
    expected = activity.generate(
        user_id,
        START,
        7,
        "stress_period",
        seed=3,
        nights=sleep.nights(START, 7, "stress_period", seed=3),
    )
    assert [r["steps"] for r in rows] == daily(expected)[:7]
