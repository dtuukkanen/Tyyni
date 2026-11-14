"""Sleep simulator (#7). Shape tests compare against stable_average with the same seed, which
shares the exact same noise, so they check the scenario shape rather than luck of the draw."""

import statistics
import uuid
from datetime import date, datetime, timedelta

import pytest
from sqlalchemy import text

from app.db import get_session
from app.db import repository as repo
from app.simulators import hrv, sleep, sleep_window, timelines

UID = uuid.UUID(int=0)
START = date(2026, 10, 1)  # a Thursday
DAYS = 21
SEED = 7


def gen(scenario="stable_average", **kw):
    kw.setdefault("seed", SEED)
    return sleep.generate(UID, START, kw.pop("days", DAYS), scenario, **kw)


def hours_in_bed(r):
    return (r["wake_time"] - r["bedtime"]).total_seconds() / 3600


def bedtime_hour(r):
    """Hours after midnight of the evening before waking (23:30 -> 23.5, 01:00 -> 25.0)."""
    evening = r["wake_time"].date() - timedelta(days=1)
    return (r["bedtime"].replace(tzinfo=None) - _midnight(evening)).total_seconds() / 3600


def wake_hour(r):
    return (
        r["wake_time"].replace(tzinfo=None) - _midnight(r["wake_time"].date())
    ).total_seconds() / 3600


def _midnight(d):
    return datetime(d.year, d.month, d.day)


def test_deterministic_one_session_per_wake_day():
    rows = gen(seed=1)
    assert rows == gen(seed=1)
    assert rows != gen(seed=2)
    assert [r["wake_time"].date() for r in rows] == [START + timedelta(days=d) for d in range(DAYS)]
    assert {r["source"] for r in rows} == {"simulator:sleep:stable_average"}
    assert len(sleep.nights(START, DAYS, seed=1)) == DAYS + 1
    assert sleep.nights(START, DAYS, seed=1)[:DAYS] == [
        {k: v for k, v in r.items() if k not in ("user_id", "source")} for r in rows
    ]


def test_rejects_bad_arguments():
    with pytest.raises(ValueError):
        gen("nope")
    with pytest.raises(ValueError):
        gen(days=0)


@pytest.mark.parametrize("scenario", sleep.SCENARIOS)
@pytest.mark.parametrize("seed", range(3))
def test_sessions_are_consistent(scenario, seed):
    for r in gen(scenario, seed=seed, artifacts=True):
        in_bed_min = (r["wake_time"] - r["bedtime"]).total_seconds() / 60
        assert in_bed_min == int(in_bed_min) >= sleep.MIN_IN_BED_MIN
        assert r["bedtime"].second == 0 and r["wake_time"].second == 0
        assert sleep.EFFICIENCY_RANGE[0] <= r["efficiency"] <= sleep.EFFICIENCY_RANGE[1]
        stages = r["stages"]
        assert set(stages) == {"deep", "rem", "light", "awake"}
        assert all(v >= 0 for v in stages.values())
        assert sum(stages.values()) == in_bed_min
        asleep = in_bed_min - stages["awake"]
        assert asleep == pytest.approx(in_bed_min * r["efficiency"], abs=1)


@pytest.mark.parametrize("seed", range(5))
def test_stable_levels_are_ordered_and_plausible(seed):
    rows = {lvl: gen(f"stable_{lvl}", seed=seed) for lvl in ("good", "average", "poor")}
    hours = {lvl: statistics.fmean(map(hours_in_bed, r)) for lvl, r in rows.items()}
    eff = {lvl: statistics.fmean(x["efficiency"] for x in r) for lvl, r in rows.items()}
    asleep = {lvl: hours[lvl] * eff[lvl] for lvl in rows}
    assert eff["good"] > eff["average"] > eff["poor"]
    assert asleep["good"] > asleep["average"] > asleep["poor"]
    assert 7.2 < asleep["good"] < 8.2
    assert 6.5 < asleep["average"] < 7.5
    assert 4.8 < asleep["poor"] < 6.2
    spread = {lvl: statistics.stdev(map(bedtime_hour, r)) for lvl, r in rows.items()}
    assert spread["poor"] > spread["good"]


def test_average_sleeper_matches_default_window():
    bed = statistics.fmean(map(bedtime_hour, gen()))
    wake = statistics.fmean(map(wake_hour, gen()))
    assert bed == pytest.approx(sleep_window.SLEEP_START_H, abs=0.3)
    assert wake == pytest.approx(sleep_window.SLEEP_END_H, abs=0.3)


def test_weekend_shift_sleeps_in_on_weekends():
    rows, base = gen("weekend_shift"), gen()
    weekend = [r for r in rows if r["wake_time"].weekday() in (5, 6)]
    weekday = [r for r in rows if r["wake_time"].weekday() not in (5, 6)]
    assert len(weekend) == 6
    sleep_in = statistics.fmean(map(wake_hour, weekend)) - statistics.fmean(map(wake_hour, weekday))
    assert sleep_in > 1.5
    for r, b in zip(rows, base, strict=True):
        if r["wake_time"].weekday() not in (5, 6):
            assert r == {**b, "source": r["source"]}  # weekdays are untouched


def test_late_sleep_shift_follows_default_window():
    rows, base = gen("late_sleep_shift"), gen()
    for d, (r, b) in enumerate(zip(rows, base, strict=True)):
        night = d - 1
        bed, wake = sleep_window.default_night(timelines.late_sleep_shift(night))
        assert bedtime_hour(r) - bedtime_hour(b) == pytest.approx(bed - sleep_window.SLEEP_START_H)
        assert wake_hour(r) - wake_hour(b) == pytest.approx(wake - 24 - sleep_window.SLEEP_END_H)
    assert bedtime_hour(rows[-1]) - bedtime_hour(base[-1]) == pytest.approx(3.0)
    assert hours_in_bed(rows[-1]) < hours_in_bed(base[-1]) - 0.5  # later and shorter


def test_oversleep_goes_later_and_longer():
    rows, base = gen("oversleep"), gen()
    late = slice(DAYS - 5, DAYS)
    extra = [hours_in_bed(r) - hours_in_bed(b) for r, b in zip(rows[late], base[late], strict=True)]
    assert all(x == pytest.approx(2.0, abs=0.01) for x in extra)
    assert statistics.fmean(map(wake_hour, rows[late])) > 9.5
    assert statistics.fmean(map(bedtime_hour, rows[late])) > 24
    assert rows[: DAYS // 3] == [{**b, "source": rows[0]["source"]} for b in base[: DAYS // 3]]


def test_stress_period_worse_sleep_then_recovers():
    rows, base = gen("stress_period"), gen()
    eff = [r["efficiency"] - b["efficiency"] for r, b in zip(rows, base, strict=True)]
    hold = range(10, 15)  # nights 9..13: inside the stress hold (onset 7, +2, end 14)
    assert all(eff[d] < -0.1 for d in hold)
    assert all(abs(x) < 0.001 for x in eff[:7])
    assert abs(eff[-1]) < 0.001
    assert statistics.fmean(rows[d]["stages"]["deep"] for d in hold) < 0.8 * statistics.fmean(
        base[d]["stages"]["deep"] for d in hold
    )
    assert statistics.fmean(hours_in_bed(rows[d]) for d in hold) < statistics.fmean(
        hours_in_bed(base[d]) for d in hold
    )


def test_short_night_then_rebound():
    rows, base = gen("short_night"), gen()
    drop = DAYS // 2
    assert hours_in_bed(rows[drop]) < 4.5
    assert hours_in_bed(rows[drop + 1]) > hours_in_bed(base[drop + 1]) + 1
    others = [d for d in range(DAYS) if d not in (drop, drop + 1)]
    assert all(rows[d]["bedtime"] == base[d]["bedtime"] for d in others)


@pytest.mark.parametrize("seed", range(3))
def test_artifacts_drop_nights_only(seed):
    clean, noisy = gen(seed=seed), gen(artifacts=True, seed=seed)
    assert 0 < len(clean) - len(noisy) < 0.3 * len(clean)
    assert all(r in clean for r in noisy)


# --- HRV link ------------------------------------------------------------------------


def hrv_mean_at(rows, hour):
    return statistics.fmean(r["hrv_rmssd_ms"] for r in rows if r["ts"].hour == hour)


def test_hrv_follows_given_nights():
    def shifted(rows, hours):
        return [
            {
                **r,
                "bedtime": r["bedtime"] + timedelta(hours=hours),
                "wake_time": r["wake_time"] + timedelta(hours=hours),
            }
            for r in rows
        ]

    on_time = sleep.nights(START, DAYS, seed=SEED)
    late = shifted(on_time, 3)
    a = hrv.generate(UID, START, DAYS, seed=SEED, nights=on_time)
    b = hrv.generate(UID, START, DAYS, seed=SEED, nights=late)
    assert hrv_mean_at(b, 8) > 1.15 * hrv_mean_at(a, 8)  # still asleep at 08 UTC
    assert hrv_mean_at(b, 23) < 0.9 * hrv_mean_at(a, 23)  # not yet asleep at 23 UTC
    # nights following the default schedule look like the default
    default = hrv.generate(UID, START, DAYS, seed=SEED)
    assert hrv_mean_at(a, 3) == pytest.approx(hrv_mean_at(default, 3), rel=0.05)
    assert hrv_mean_at(a, 14) == pytest.approx(hrv_mean_at(default, 14), rel=0.02)


def test_hrv_poorer_nights_restore_less():
    nights = sleep.nights(START, DAYS, seed=SEED)
    poor = [{**r, "efficiency": 0.6} for r in nights]
    good = hrv.generate(UID, START, DAYS, seed=SEED, nights=nights)
    bad = hrv.generate(UID, START, DAYS, seed=SEED, nights=poor)
    assert hrv_mean_at(bad, 3) < 0.95 * hrv_mean_at(good, 3)
    assert hrv_mean_at(bad, 14) == pytest.approx(hrv_mean_at(good, 14))


def test_hrv_without_nights_is_awake():
    rows = hrv.generate(UID, START, 3, seed=SEED, nights=[])
    assert hrv_mean_at(rows, 3) < 1.1 * hrv_mean_at(rows, 14)


# --- DB integration ------------------------------------------------------------------


@pytest.fixture
def user_id():
    with get_session() as s:
        uid = repo.create_user(s, "sleep-sim-test")
    yield uid
    with get_session() as s:
        s.execute(text("DELETE FROM users WHERE id = :u"), {"u": uid})


def test_simulate_writes_daily_metrics_and_replaces(user_id):
    end = START + timedelta(days=DAYS - 1)
    with get_session() as s:
        sleep.simulate(s, user_id, START, DAYS, "stress_period", seed=SEED)
    with get_session() as s:
        n = sleep.simulate(s, user_id, START, DAYS, "oversleep", seed=SEED)
        count, sources = s.execute(
            text(
                "SELECT count(*), array_agg(DISTINCT source) FROM sleep_sessions WHERE user_id = :u"
            ),
            {"u": user_id},
        ).one()
        rows = repo.daily_metrics(s, user_id, START, end)
    assert count == n == DAYS
    assert sources == ["simulator:sleep:oversleep"]
    expected = gen("oversleep")
    for day, r in zip(rows, expected, strict=True):
        assert day["sleep_duration_min"] == pytest.approx(hours_in_bed(r) * 60)
        assert float(day["bedtime_hour"]) == pytest.approx(bedtime_hour(r))
        assert float(day["wake_hour"]) == pytest.approx(wake_hour(r))
    assert rows[-1]["sleep_duration_min"] > rows[0]["sleep_duration_min"] + 60

    with get_session() as s:
        repo.delete_source_data(s, user_id, sleep.SOURCE_PREFIX)
        rows = repo.daily_metrics(s, user_id, START, end)
    assert all(r["sleep_duration_min"] is None for r in rows)


def test_cli_with_hrv_writes_both(user_id):
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
            "--with-hrv",
        ]
    )
    with get_session() as s:
        rows = repo.daily_metrics(s, user_id, START, START + timedelta(days=6))
        hrv_source = s.execute(
            text("SELECT DISTINCT source FROM heart_samples WHERE user_id = :u"), {"u": user_id}
        ).scalar_one()
    assert hrv_source == "simulator:hrv:stress_period"
    assert all(r["sleep_duration_min"] is not None and r["hrv_rmssd_avg"] is not None for r in rows)
