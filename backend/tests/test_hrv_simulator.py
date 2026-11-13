"""HRV simulator (#6). Shape tests compare against stable_average with the same seed, which
shares the exact same noise, so they check the scenario shape rather than luck of the draw."""

import itertools
import math
import statistics
import uuid
from collections import defaultdict
from datetime import date, timedelta

import pytest
from sqlalchemy import text

from app.db import get_session
from app.db import repository as repo
from app.simulators import hrv

UID = uuid.UUID(int=0)
START = date(2026, 10, 1)
DAYS = 21
SEED = 7


def gen(scenario="stable_average", **kw):
    kw.setdefault("seed", SEED)
    return hrv.generate(UID, START, kw.pop("days", DAYS), scenario, **kw)


def daily(rows, field="hrv_rmssd_ms"):
    by_day = defaultdict(list)
    for r in rows:
        by_day[r["ts"].date()].append(r[field])
    return [statistics.fmean(by_day[d]) for d in sorted(by_day)]


def hours_mean(rows, hours, days=None, field="hrv_rmssd_ms"):
    """Mean of `field` for samples whose UTC hour is in `hours` (on day indexes `days`)."""
    return statistics.fmean(
        r[field]
        for r in rows
        if r["ts"].hour in hours and (days is None or (r["ts"].date() - START).days in days)
    )


def ratios(rows, base_rows):
    return [a / b for a, b in zip(daily(rows), daily(base_rows), strict=True)]


def test_deterministic_and_full_grid():
    rows = gen(seed=1)
    assert rows == gen(seed=1)
    assert rows != gen(seed=2)
    assert len(rows) == DAYS * 24 * 12
    assert len(gen(interval_min=15)) == DAYS * 24 * 4
    assert {r["source"] for r in rows} == {"simulator:hrv:stable_average"}


def test_rejects_bad_arguments():
    with pytest.raises(ValueError):
        gen("nope")
    with pytest.raises(ValueError):
        gen(timescale="weekly")
    with pytest.raises(ValueError):
        gen(interval_min=7)


@pytest.mark.parametrize("seed", range(5))
def test_stable_levels_are_ordered_and_plausible(seed):
    means = {
        lvl: statistics.fmean(daily(gen(f"stable_{lvl}", seed=seed)))
        for lvl in ("high", "average", "low")
    }
    assert means["high"] > means["average"] > means["low"]
    assert 60 < means["high"] < 110
    assert 35 < means["average"] < 65
    assert 15 < means["low"] < 35
    hr = {
        lvl: statistics.fmean(daily(gen(f"stable_{lvl}", seed=seed), "hr_bpm"))
        for lvl in ("high", "average", "low")
    }
    assert hr["high"] < hr["average"] < hr["low"]
    assert all(45 < v < 85 for v in hr.values())


def test_night_hrv_higher_and_hr_inverse():
    rows = gen()
    night, day = hours_mean(rows, range(0, 6)), hours_mean(rows, range(10, 20))
    assert night > 1.15 * day
    assert (
        hours_mean(rows, range(0, 6), field="hr_bpm")
        < hours_mean(rows, range(10, 20), field="hr_bpm") - 5
    )
    assert (
        statistics.correlation([r["hrv_rmssd_ms"] for r in rows], [r["hr_bpm"] for r in rows])
        < -0.5
    )


@pytest.mark.parametrize("scenario,sign", [("rising", 1), ("lowering", -1)])
def test_days_trend(scenario, sign):
    rows = gen(scenario)
    r = ratios(rows, gen())
    assert r[-1] / r[0] == pytest.approx(math.exp(sign * math.log(1.25 / 0.75)), rel=0.03)
    d = daily(rows)
    assert sign * (statistics.fmean(d[-3:]) / statistics.fmean(d[:3]) - 1) > 0.15


def test_days_alternating():
    d = daily(gen("alternating"))
    diffs = [b - a for a, b in itertools.pairwise(d)]
    assert all(x < 0 for x in diffs[0::2]) and all(x > 0 for x in diffs[1::2])


@pytest.mark.parametrize("scenario,sign", [("rising", 1), ("lowering", -1)])
def test_intraday_trend_keeps_daily_mean(scenario, sign):
    rows = gen(scenario, timescale="intraday")
    assert all(abs(x - 1) < 0.05 for x in ratios(rows, gen()))
    morning, evening = hours_mean(rows, range(8, 11)), hours_mean(rows, range(19, 22))
    assert sign * (evening / morning - 1) > 0.2


def test_intraday_alternating_swings_within_day():
    rows, base = gen("alternating", timescale="intraday"), gen()
    # sin(2*pi*h/6) > 0 for h in (0, 3) mod 6 -> higher; (3, 6) -> lower
    up = hours_mean(rows, {13}) / hours_mean(base, {13})
    down = hours_mean(rows, {16}) / hours_mean(base, {16})
    assert up > 1.12 and down < 0.88
    assert all(abs(x - 1) < 0.05 for x in ratios(rows, base))


def test_stress_period_dips_and_recovers():
    r = ratios(gen("stress_period"), gen())
    assert all(x == pytest.approx(1, abs=0.01) for x in r[:7])
    assert all(x < 0.65 for x in r[9:14])
    assert r[-1] == pytest.approx(1, abs=0.01)
    hr = [
        a / b
        for a, b in zip(daily(gen("stress_period"), "hr_bpm"), daily(gen(), "hr_bpm"), strict=True)
    ]
    assert min(hr[9:14]) > 1.1  # stress also shows as raised HR


def test_sudden_drop():
    r = ratios(gen("sudden_drop"), gen())
    drop = DAYS // 2
    assert all(x == pytest.approx(1, abs=0.01) for x in r[:drop])
    assert r[drop] < 0.55
    assert r[drop] < r[drop + 1] < r[drop + 2] < r[-1]
    assert r[-1] > 0.95


def test_late_sleep_shift_moves_night_peak_later():
    rows, base = gen("late_sleep_shift"), gen()
    early, late = range(0, 2), range(DAYS - 4, DAYS)

    def ratio(hour, days):
        return hours_mean(rows, {hour}, days) / hours_mean(base, {hour}, days)

    # 08-09 UTC: awake at the start, still asleep once bedtime has moved 3 h later
    assert ratio(8, early) < 1.02
    assert ratio(8, late) > ratio(8, early) + 0.08
    # 23-00 UTC: asleep at the start, awake later
    assert ratio(23, late) < ratio(23, early) - 0.08
    assert ratio(23, late) < 0.85


@pytest.mark.parametrize("seed", range(3))
def test_artifacts_add_gaps_and_spikes_within_bounds(seed):
    clean, noisy = gen(seed=seed), gen(artifacts=True, seed=seed)
    assert len(noisy) < len(clean)
    clean_by_ts = {r["ts"]: r["hrv_rmssd_ms"] for r in clean}
    changed = sum(1 for r in noisy if r["hrv_rmssd_ms"] != clean_by_ts[r["ts"]])
    assert 0 < changed < 0.03 * len(noisy)  # spikes only; the rest is the same signal
    for r in noisy:
        assert hrv.RMSSD_RANGE[0] <= r["hrv_rmssd_ms"] <= hrv.RMSSD_RANGE[1]
        assert hrv.HR_RANGE[0] <= r["hr_bpm"] <= hrv.HR_RANGE[1]


# --- DB integration ------------------------------------------------------------------


@pytest.fixture
def user_id():
    with get_session() as s:
        uid = repo.create_user(s, "hrv-sim-test")
    yield uid
    with get_session() as s:
        s.execute(text("DELETE FROM users WHERE id = :u"), {"u": uid})


def test_simulate_writes_daily_metrics_and_replaces(user_id):
    end = START + timedelta(days=DAYS - 1)
    with get_session() as s:
        n = hrv.simulate(s, user_id, START, DAYS, "stress_period", seed=SEED)
    with get_session() as s:
        hrv.simulate(s, user_id, START, DAYS, "stable_low", seed=SEED)  # replaces, no leftovers
        count, sources = s.execute(
            text(
                "SELECT count(*), array_agg(DISTINCT source) FROM heart_samples WHERE user_id = :u"
            ),
            {"u": user_id},
        ).one()
        rows = repo.daily_metrics(s, user_id, START, end)
    assert count == n
    assert sources == ["simulator:hrv:stable_low"]
    assert all(r["hrv_rmssd_avg"] is not None and r["hr_avg"] is not None for r in rows)
    assert statistics.fmean(r["hrv_rmssd_avg"] for r in rows) < 35

    with get_session() as s:
        repo.delete_source_data(s, user_id, hrv.SOURCE_PREFIX)
        rows = repo.daily_metrics(s, user_id, START, end)
    assert all(r["hrv_rmssd_avg"] is None for r in rows)
