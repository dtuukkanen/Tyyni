"""Screen time simulator. Shape tests compare against stable_average with the same seed, which
shares the exact same noise, so they check the scenario shape rather than luck of the draw."""

import statistics
import uuid
from collections import defaultdict
from datetime import date, timedelta

import pytest
from sqlalchemy import text

from app.db import get_session
from app.db import repository as repo
from app.simulators import common, screen, sleep

UID = uuid.UUID(int=0)
START = date(2026, 10, 1)  # a Thursday
DAYS = 21
SEED = 7


def gen(scenario="stable_average", **kw):
    kw.setdefault("seed", SEED)
    return screen.generate(UID, START, kw.pop("days", DAYS), scenario, **kw)


def daily(rows):
    by_day = defaultdict(float)
    for r in rows:
        by_day[r["ts"].date()] += r["screen_time_min"]
    return [by_day[START + timedelta(days=d)] for d in range(DAYS)]


def by_day(rows):
    out = defaultdict(list)
    for r in rows:
        out[r["ts"].date()].append({k: v for k, v in r.items() if k != "source"})
    return [out[START + timedelta(days=d)] for d in range(DAYS)]


def minutes_between(rows, first_hour, last_hour, days=range(DAYS)):
    """Screen minutes with first_hour <= hour < last_hour on the given day indexes."""
    wanted = {START + timedelta(days=d) for d in days}
    return sum(
        r["screen_time_min"]
        for r in rows
        if r["ts"].date() in wanted and first_hour <= r["ts"].hour < last_hour
    )


def use_hour(rows):
    """Usage-weighted mean hour of the day; hours before 04:00 count as the previous evening."""
    hours = [r["ts"].hour + r["ts"].minute / 60 for r in rows]
    hours = [h + 24 if h < 4 else h for h in hours]
    return sum(h * r["screen_time_min"] for h, r in zip(hours, rows, strict=True)) / sum(
        r["screen_time_min"] for r in rows
    )


def test_deterministic_rows_on_the_interval():
    rows = gen(seed=1)
    assert rows == gen(seed=1)
    assert rows != gen(seed=2)
    assert len(rows) == DAYS * 24 * 4
    assert all(r["ts"].minute % 15 == 0 and r["ts"].second == 0 for r in rows)
    assert {r["source"] for r in rows} == {"simulator:screen:stable_average"}
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


@pytest.mark.parametrize("scenario", screen.SCENARIOS)
@pytest.mark.parametrize("seed", range(3))
def test_samples_are_whole_minutes_within_the_interval(scenario, seed):
    for r in gen(scenario, seed=seed, artifacts=True):
        assert r["screen_time_min"] == int(r["screen_time_min"])
        assert 0 <= r["screen_time_min"] <= 15


@pytest.mark.parametrize("seed", range(5))
def test_stable_levels_are_ordered_and_plausible(seed):
    hours = {
        lvl: statistics.fmean(daily(gen(f"stable_{lvl}", seed=seed))) / 60
        for lvl in ("light", "average", "heavy")
    }
    assert 1.5 < hours["light"] < 2.6
    assert 3.0 < hours["average"] < 4.2
    assert 4.8 < hours["heavy"] < 6.3


def test_use_comes_in_sessions():
    minutes = [r["screen_time_min"] for r in gen(interval_min=1)]
    sessions = sum(1 for prev, cur in zip([0.0, *minutes], minutes, strict=False) if cur > prev)
    assert 1.6 < sum(minutes) / sessions < 2.4  # SESSION_MIN on average


def test_no_screen_while_asleep_and_most_in_the_evening():
    rows = gen()
    assert minutes_between(rows, 0, 7) == 0
    assert minutes_between(rows, 23, 24) == 0  # in bed from 23:00
    # scrolling in bed before sleep beats the early afternoon, hour for hour
    assert minutes_between(rows, 22, 23) > 1.5 * minutes_between(rows, 14, 16) / 2


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
    assert use_hour(shifted) - use_hour(on_time) == pytest.approx(3, abs=0.5)
    for rows, sessions in ((on_time, nights), (shifted, late)):
        for n in sessions:
            assert not any(
                r["screen_time_min"]
                for r in rows
                if n["bedtime"] + timedelta(minutes=15) <= r["ts"]
                and r["ts"] + timedelta(minutes=15) <= n["wake_time"]
            )
    assert gen(nights=[]) != gen()  # no nights: awake around the clock


def test_stress_period_more_screen_time_then_recovers():
    rows, base = gen("stress_period"), gen()
    assert by_day(rows)[:7] == by_day(base)[:7]  # normal first third, same noise
    hold = range(9, 14)
    total, base_total = daily(rows), daily(base)
    assert sum(total[d] for d in hold) > 1.4 * sum(base_total[d] for d in hold)
    assert by_day(rows)[-1] == by_day(base)[-1]  # recovered


def test_withdrawal_rises_gradually():
    rows, base = gen("withdrawal"), gen()
    assert by_day(rows)[:7] == by_day(base)[:7]
    ratio = [t / b for t, b in zip(daily(rows), daily(base), strict=True)]
    assert statistics.fmean(ratio[-4:]) > 1.8
    assert statistics.fmean(ratio[8:12]) < statistics.fmean(ratio[-4:])


def test_sudden_drop_day_on_the_phone_then_recovers():
    rows, base = gen("sudden_drop"), gen()
    drop = DAYS // 2
    total, base_total = daily(rows), daily(base)
    assert by_day(rows)[:drop] == by_day(base)[:drop]
    assert total[drop] > 1.6 * base_total[drop]
    assert total[drop + 1] > base_total[drop + 1]
    assert sum(total[-3:]) < 1.1 * sum(base_total[-3:])


def test_late_sleep_shift_keeps_the_phone_on_later():
    rows, base = gen("late_sleep_shift"), gen()
    last = range(DAYS - 5, DAYS)
    assert minutes_between(base, 23, 24, last) == 0
    assert minutes_between(rows, 23, 24, last) > 30  # bedtime is 01:00-02:00 by then
    assert use_hour(rows) - use_hour(base) > 1.0


def test_oversleep_lies_in_bed_with_the_phone():
    rows, base = gen("oversleep"), gen()
    assert by_day(rows)[:8] == by_day(base)[:8]
    last = range(DAYS - 5, DAYS)
    assert minutes_between(rows, 7, 8, last) > 1.5 * minutes_between(base, 7, 8, last)
    assert sum(daily(rows)[-5:]) > 1.15 * sum(daily(base)[-5:])


@pytest.mark.parametrize("seed", range(3))
def test_artifacts_drop_rows_only(seed):
    clean, noisy = gen(seed=seed), gen(artifacts=True, seed=seed)
    assert 0 < len(clean) - len(noisy) < 0.3 * len(clean)
    clean_set = {(r["ts"], r["screen_time_min"]) for r in clean}
    assert all((r["ts"], r["screen_time_min"]) in clean_set for r in noisy)


# --- DB integration ------------------------------------------------------------------


@pytest.fixture
def user_id():
    with get_session() as s:
        uid = repo.create_user(s, "screen-sim-test")
    yield uid
    with get_session() as s:
        s.execute(text("DELETE FROM users WHERE id = :u"), {"u": uid})


def test_simulate_writes_daily_metrics_and_replaces_only_its_own_rows(user_id):
    end = START + timedelta(days=DAYS - 1)
    device = {"user_id": user_id, "ts": common.midnight(end), "screen_time_min": 5.0}
    with get_session() as s:
        screen.simulate(s, user_id, START, DAYS, "stress_period", seed=SEED)
        repo.insert_activity_samples(
            s, [{"user_id": user_id, "ts": device["ts"], "steps": 100, "active_minutes": 1}]
        )
    with get_session() as s:
        n = screen.simulate(s, user_id, START, DAYS, "withdrawal", seed=SEED)
        sources = s.execute(
            text("SELECT array_agg(DISTINCT source) FROM screen_samples WHERE user_id = :u"),
            {"u": user_id},
        ).scalar_one()
        rows = repo.daily_metrics(s, user_id, START, end)
    assert n == DAYS * 96
    assert sources == ["simulator:screen:withdrawal"]
    assert [r["screen_time_min"] for r in rows] == pytest.approx(daily(gen("withdrawal")))
    assert rows[-1]["steps"] == 100  # activity at the same ts is a separate row

    with get_session() as s:
        repo.delete_source_data(s, user_id, screen.SOURCE_PREFIX)
        repo.insert_screen_samples(s, [device])  # e.g. from the phone
        screen.simulate(s, user_id, START, 1, seed=SEED)
        rows = repo.daily_metrics(s, user_id, START, end)
        assert repo.screen_samples(s, user_id, device["ts"], device["ts"] + timedelta(hours=1))
    assert rows[0]["screen_time_min"] > 0
    assert all(r["screen_time_min"] is None for r in rows[1:-1])
    assert rows[-1]["screen_time_min"] == 5.0  # the device row survives a simulator rerun


def test_cli_writes_samples(user_id, capsys):
    screen.main(
        ["--user", str(user_id), "--start", START.isoformat(), "--days", "2", "--seed", "1"]
    )
    assert "wrote 192 screen time samples (stable_average" in capsys.readouterr().out
    with get_session() as s:
        rows = repo.daily_metrics(s, user_id, START, START + timedelta(days=1))
    assert all(r["screen_time_min"] > 60 for r in rows)


def test_sleep_cli_with_screen_follows_its_nights(user_id):
    args = ["--user", str(user_id), "--scenario", "late_sleep_shift", "--start", START.isoformat()]
    sleep.main([*args, "--days", "7", "--seed", "3", "--with-screen"])
    with get_session() as s:
        rows = repo.daily_metrics(s, user_id, START, START + timedelta(days=6))
        source = s.execute(
            text("SELECT DISTINCT source FROM screen_samples WHERE user_id = :u"),
            {"u": user_id},
        ).scalar_one()
    assert source == "simulator:screen:late_sleep_shift"
    expected = screen.generate(
        user_id,
        START,
        7,
        "late_sleep_shift",
        seed=3,
        nights=sleep.nights(START, 7, "late_sleep_shift", seed=3),
    )
    by_date = defaultdict(float)
    for r in expected:
        by_date[r["ts"].date()] += r["screen_time_min"]
    assert [r["screen_time_min"] for r in rows] == [by_date[r["day"]] for r in rows]
