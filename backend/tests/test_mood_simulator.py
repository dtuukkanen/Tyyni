"""Mood check-in simulator. Shape tests compare against stable_average with the same seed, which
shares the exact same noise, so they check the scenario shape rather than luck of the draw."""

import statistics
import uuid
from datetime import date, timedelta

import pytest
from sqlalchemy import text

from app.db import get_session
from app.db import repository as repo
from app.simulators import mood, sleep
from app.simulators.common import midnight

UID = uuid.UUID(int=0)
START = date(2026, 10, 1)  # a Thursday
DAYS = 21
SEED = 7
SEEDS = range(20)


def gen(scenario="stable_average", **kw):
    kw.setdefault("seed", SEED)
    return mood.generate(UID, START, kw.pop("days", DAYS), scenario, **kw)


def scores(rows):
    """Score per day index, None on days without a check-in."""
    out: dict[int, int] = {}
    for r in rows:
        out.setdefault((r["ts"].date() - START).days, r["score"])
    return [out.get(d) for d in range(DAYS)]


def mean_score(scenario, days, **kw):
    """Mean score over SEEDS on the given day indexes."""
    values = [
        s
        for seed in SEEDS
        for d, s in enumerate(scores(gen(scenario, seed=seed, **kw)))
        if d in days and s is not None
    ]
    return statistics.fmean(values)


def test_deterministic_one_evening_checkin_per_day():
    rows = gen(seed=1)
    assert rows == gen(seed=1)
    assert rows != gen(seed=2)
    assert {r["source"] for r in rows} == {"simulator:mood:stable_average"}
    days = [r["ts"].date() for r in rows]
    assert len(days) == len(set(days))
    assert all(START <= d < START + timedelta(days=DAYS) for d in days)
    assert all(19 <= r["ts"].hour <= 23 for r in rows)  # bed at 23:00 by default


def test_rejects_bad_arguments():
    with pytest.raises(ValueError):
        gen("nope")
    with pytest.raises(ValueError):
        gen(days=0)


@pytest.mark.parametrize("scenario", mood.SCENARIOS)
@pytest.mark.parametrize("seed", range(3))
def test_scores_are_on_the_scale(scenario, seed):
    for r in gen(scenario, seed=seed, artifacts=True):
        assert isinstance(r["score"], int) and 1 <= r["score"] <= 5


def test_stable_levels_are_ordered_and_plausible():
    every_day = range(DAYS)
    good, average, low = (mean_score(f"stable_{p}", every_day) for p in ("good", "average", "low"))
    assert 3.7 < good < 4.4
    assert 3.1 < average < 3.7
    assert 2.2 < low < 2.9
    rate = statistics.fmean(len(gen(seed=s)) / DAYS for s in SEEDS)
    assert 0.75 < rate < 0.95


def test_weekends_feel_a_bit_better():
    rows = [r for s in SEEDS for r in gen(seed=s)]
    weekend = statistics.fmean(r["score"] for r in rows if r["ts"].weekday() >= 5)
    weekday = statistics.fmean(r["score"] for r in rows if r["ts"].weekday() < 5)
    assert weekend > weekday


def test_stress_period_lowers_mood_then_recovers():
    rows, base = gen("stress_period"), gen()
    assert scores(rows)[:7] == scores(base)[:7]  # normal first third, same noise
    assert scores(rows)[17:] == scores(base)[17:]  # recovered, same noise
    hold = range(9, 14)
    assert mean_score("stress_period", hold) < mean_score("stable_average", hold) - 0.8


def test_withdrawal_lowers_mood_and_checkins():
    last = range(DAYS - 5, DAYS)
    assert mean_score("withdrawal", last) < mean_score("stable_average", last) - 0.6

    def checkins(scenario):
        return sum(s is not None for seed in SEEDS for s in scores(gen(scenario, seed=seed))[-5:])

    assert checkins("withdrawal") < 0.8 * checkins("stable_average")


def test_sudden_drop_then_recovers():
    drop = DAYS // 2
    assert mean_score("sudden_drop", {drop}) < mean_score("stable_average", {drop}) - 1.5
    assert scores(gen("sudden_drop"))[:drop] == scores(gen())[:drop]
    late = range(DAYS - 4, DAYS)
    assert mean_score("sudden_drop", late) == pytest.approx(
        mean_score("stable_average", late), abs=0.1
    )


def test_crisis_ends_very_low():
    assert mean_score("crisis", range(DAYS - 3, DAYS)) < 2.0


@pytest.mark.parametrize("scenario", ["oversleep", "late_sleep_shift"])
def test_sleep_scenarios_lower_mood_late_in_the_period(scenario):
    last = range(DAYS - 5, DAYS)
    assert mean_score(scenario, last) < mean_score("stable_average", last) - 0.3


def test_late_sleep_shift_checkins_stay_on_their_own_day():
    for seed in SEEDS:
        for r in gen("late_sleep_shift", seed=seed):
            assert r["ts"].hour >= 19
            assert r["ts"].hour * 60 + r["ts"].minute <= 60 * mood.LATEST_CHECKIN_H


def test_follows_given_nights():
    nights = sleep.nights(START, DAYS, seed=SEED)
    for r in gen(nights=nights):
        tonight = min((n for n in nights if n["bedtime"] > r["ts"]), key=lambda n: n["bedtime"])
        assert tonight["bedtime"] - timedelta(hours=2.6) <= r["ts"] <= tonight["bedtime"]


def test_poor_nights_lower_mood():
    nights = sleep.nights(START, DAYS, seed=SEED)
    poor = [{**n, "efficiency": 0.6} for n in nights]
    good = [{**n, "efficiency": 0.95} for n in nights]
    every_day = range(1, DAYS)
    assert mean_score("stable_average", every_day, nights=poor) < mean_score(
        "stable_average", every_day, nights=good
    )


@pytest.mark.parametrize("seed", range(5))
def test_artifacts_drop_days_and_double_tap(seed):
    clean, noisy = gen(seed=seed), gen(artifacts=True, seed=seed)
    clean_set = {(r["ts"], r["score"]) for r in clean}
    singles = [r for r in noisy if (r["ts"], r["score"]) in clean_set]
    doubles = [r for r in noisy if (r["ts"], r["score"]) not in clean_set]
    assert all((r["ts"] - timedelta(minutes=1), r["score"]) in clean_set for r in doubles)
    assert len(singles) <= len(clean)


def test_artifacts_drop_some_days_overall():
    clean = sum(len(gen(seed=s)) for s in SEEDS)
    noisy_days = sum(len({r["ts"].date() for r in gen(artifacts=True, seed=s)}) for s in SEEDS)
    assert 0.7 * clean < noisy_days < clean


# --- DB integration ------------------------------------------------------------------


@pytest.fixture
def user_id():
    with get_session() as s:
        uid = repo.create_user(s, "mood-sim-test")
    yield uid
    with get_session() as s:
        s.execute(text("DELETE FROM users WHERE id = :u"), {"u": uid})


def test_simulate_writes_daily_metrics_and_keeps_app_checkins(user_id):
    end = START + timedelta(days=DAYS - 1)
    app_ts = START + timedelta(days=DAYS)  # the day after the simulated period
    with get_session() as s:
        repo.record_mood(s, user_id, score=5, ts=midnight(app_ts) + timedelta(hours=12))
        mood.simulate(s, user_id, START, DAYS, "stress_period", seed=SEED)
    with get_session() as s:
        n = mood.simulate(s, user_id, START, DAYS, "withdrawal", seed=SEED)
        sources = s.execute(
            text("SELECT source, count(*) FROM mood_checkins WHERE user_id = :u GROUP BY 1"),
            {"u": user_id},
        ).all()
        rows = repo.daily_metrics(s, user_id, START, end)
    assert dict(sources) == {"simulator:mood:withdrawal": n, "app": 1}
    assert [r["mood_avg"] for r in rows] == scores(gen("withdrawal"))

    with get_session() as s:
        repo.delete_source_data(s, user_id, mood.SOURCE_PREFIX)
        left = repo.mood_checkins(s, user_id, START, app_ts)
    assert [(m.score, m.source) for m in left] == [(5, "app")]


def test_cli_writes_checkins(user_id):
    mood.main(
        [
            "--user",
            str(user_id),
            "--scenario",
            "crisis",
            "--start",
            START.isoformat(),
            "--days",
            "7",
            "--seed",
            "3",
        ]
    )
    with get_session() as s:
        stored = repo.mood_checkins(s, user_id, START, START + timedelta(days=6))
    expected = mood.generate(user_id, START, 7, "crisis", seed=3)
    assert [(m.ts, m.score, m.source) for m in stored] == [
        (r["ts"], r["score"], r["source"]) for r in expected
    ]
