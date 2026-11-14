"""Activity (steps) simulator (#8).

Produces `activity_samples` rows (steps + active minutes) at a fixed interval for one user.
Steps are simulated minute by minute and summed into each interval; an active minute is a
minute with at least ACTIVE_CADENCE steps (brisk walking). Screen time is not simulated.

Each waking minute is either incidental movement or part of a walking bout:

- incidental: short, low-cadence bursts around the house / office. The day's budget (walker
  level x scenario x day noise) is spread over waking hours by a profile anchored to the wake
  time (morning, lunch and late-afternoon bumps) times slow AR(1) noise.
- bouts (~110 steps/min): two commute walks on weekdays (about 1 h and 10 h after waking), a
  midday leisure walk on most weekend days, and an optional evening exercise walk.

Nobody walks while asleep: the nights come from the HRV simulator's built-in window
(23:00-07:00 UTC, shifted for late_sleep_shift) or from real sleep sessions passed as
`nights` (e.g. `sleep.nights(...)`), and the bouts follow each day's wake time.

All randomness comes from one seeded RNG with a fixed number of draws per day and minute, so
two scenarios generated with the same seed share the same noise and differ only by their shape.

Times are UTC.

Run: python -m app.simulators.activity --new-user demo --scenario withdrawal --days 21
"""

from __future__ import annotations

import argparse
import math
import random
import statistics
import uuid
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.db import repository as repo
from app.simulators import hrv

SCENARIOS = (
    "stable_active",
    "stable_average",
    "stable_sedentary",
    "stress_period",
    "withdrawal",
    "sudden_drop",
    "late_sleep_shift",
    "oversleep",
)
SOURCE_PREFIX = "simulator:activity"


@dataclass(frozen=True)
class Walker:
    incidental: float  # incidental steps over a 16 h waking day
    commute_min: float  # length of each weekday commute walk (weekend walk: twice this)
    exercise_prob: float  # chance of an evening exercise walk


WALKERS = {
    "active": Walker(incidental=6000.0, commute_min=15.0, exercise_prob=0.6),
    "average": Walker(incidental=4000.0, commute_min=10.0, exercise_prob=0.3),
    "sedentary": Walker(incidental=2200.0, commute_min=5.0, exercise_prob=0.08),
}

ACTIVE_CADENCE = 100  # steps/min that make a minute "active"
BOUT_CADENCE = 110.0  # steps/min while walking
BOUT_CADENCE_SD = 8.0
EXERCISE_BONUS = 10.0  # exercise walks are a bit brisker
LEISURE_PROB = 0.7  # chance of a weekend walk
EXERCISE_MIN = (30.0, 50.0)

WAKING_MIN = 16 * 60  # reference waking day for the incidental budget
MOVE_STEPS = 25.0  # median steps in an incidental moving minute
MOVE_SD = 0.35  # log-space spread of those steps
MOVE_CAP = 90  # incidental minutes never count as active
DAY_SD = 0.2  # day-to-day noise on the incidental budget, log space
AR_SD = 0.5  # slow within-day noise on the incidental rate (stationary SD), log space
AR_PHI = 0.98  # AR(1) autocorrelation per minute

GAP_DAY_PROB = 0.5  # artifacts: chance of a 1-3 h gap (device not carried)
MISSING_DAY_PROB = 0.05  # artifacts: chance a whole day has no data


@dataclass(frozen=True)
class Shape:
    """How a scenario changes one day, relative to the walker's usual day."""

    incidental: float = 1.0  # incidental steps factor
    bouts: float = 1.0  # commute / weekend walk length factor
    exercise: float = 1.0  # exercise probability factor


def generate(
    user_id: uuid.UUID,
    start: date,
    days: int,
    scenario: str = "stable_average",
    *,
    artifacts: bool = False,
    interval_min: int = 15,
    seed: int | None = None,
    nights: Sequence[Mapping[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """Activity samples for `days` UTC days from `start`, shaped for insert_activity_samples.

    artifacts drops 1-3 h gaps and some whole days (device not carried); the remaining rows
    are unchanged. nights: sleep sessions ({bedtime, wake_time}, e.g. from `sleep.nights`) to
    use instead of the built-in sleep window; time not covered by any night counts as awake.
    """
    if scenario not in SCENARIOS:
        raise ValueError(f"unknown scenario {scenario!r}; choose from {SCENARIOS}")
    if days < 1:
        raise ValueError("days must be >= 1")
    if interval_min < 1 or 1440 % interval_min:
        raise ValueError("interval_min must divide a day (e.g. 1, 5, 10, 15, 30, 60)")

    walker = (
        WALKERS[scenario.removeprefix("stable_")]
        if scenario.startswith("stable_")
        else WALKERS["average"]
    )
    rng = random.Random(seed)
    artifact_rng = random.Random(rng.random())  # own stream: artifacts never shift the noise
    origin = datetime(start.year, start.month, start.day, tzinfo=UTC)
    schedule = hrv.sleep_schedule(scenario, days, origin, nights)
    source = f"{SOURCE_PREFIX}:{scenario}"

    innovation_sd = AR_SD * math.sqrt(1 - AR_PHI**2)
    ar = rng.gauss(0, AR_SD)
    rows: list[dict[str, Any]] = []
    for d in range(days):
        day = start + timedelta(days=d)
        shape = _shape(scenario, d, days)
        wake, _ = _waking_window(schedule, d)

        day_z = rng.gauss(0, 1)
        bouts = _bouts(rng, walker, shape, wake, weekend=day.weekday() >= 5)
        budget = walker.incidental * shape.incidental * math.exp(DAY_SD * day_z - DAY_SD**2 / 2)

        missing_day = artifact_rng.random() < MISSING_DAY_PROB
        gap = hrv.draw_gap(artifact_rng)

        steps = [0] * 1440
        for k in range(1440):
            ar = AR_PHI * ar + rng.gauss(0, innovation_sd)
            move_u, step_z, cadence_z = rng.random(), rng.gauss(0, 1), rng.gauss(0, 1)

            hour = k / 60
            if hrv.asleep_at(schedule, d, hour)[0] >= 0.5:
                continue
            if bouts[k] is not None:
                cadence = BOUT_CADENCE + bouts[k] + BOUT_CADENCE_SD * cadence_z
                steps[k] = max(round(cadence), 0)
                continue
            rate = (
                budget
                / WAKING_MIN
                * _profile(hour - wake)
                / PROFILE_MEAN
                * math.exp(ar - AR_SD**2 / 2)
            )
            if move_u < min(rate / MOVE_STEPS, 0.95):
                steps[k] = min(round(MOVE_STEPS * math.exp(MOVE_SD * step_z)), MOVE_CAP)

        if artifacts and missing_day:
            continue
        for i in range(0, 1440, interval_min):
            if artifacts and gap and gap[0] <= i / 60 < gap[1]:
                continue
            chunk = steps[i : i + interval_min]
            rows.append(
                {
                    "user_id": user_id,
                    "ts": origin + timedelta(days=d, minutes=i),
                    "steps": sum(chunk),
                    "active_minutes": sum(s >= ACTIVE_CADENCE for s in chunk),
                    "source": source,
                }
            )
    return rows


def simulate(
    session: Session,
    user_id: uuid.UUID,
    start: date,
    days: int,
    scenario: str = "stable_average",
    *,
    replace: bool = True,
    chunk_size: int = 2000,
    **kwargs: Any,
) -> int:
    """Generate and write activity samples. replace=True first clears earlier activity data."""
    rows = generate(user_id, start, days, scenario, **kwargs)
    if replace:
        repo.delete_source_data(session, user_id, SOURCE_PREFIX)
    for i in range(0, len(rows), chunk_size):
        repo.insert_activity_samples(session, rows[i : i + chunk_size])
    return len(rows)


# --- Day structure ---------------------------------------------------------------------


def _profile(since_wake_h: float) -> float:
    """Incidental movement over the waking day: morning, lunch and late-afternoon bumps."""
    s = since_wake_h
    return (
        0.5
        + 0.7 * math.exp(-(((s - 1.0) / 0.8) ** 2))
        + 0.6 * math.exp(-(((s - 5.5) / 1.0) ** 2))
        + 0.7 * math.exp(-(((s - 10.0) / 1.2) ** 2))
        + 0.3 * math.exp(-(((s - 13.0) / 1.5) ** 2))
    )


PROFILE_MEAN = statistics.fmean(_profile(m / 60) for m in range(WAKING_MIN))


def _waking_window(schedule: hrv.Schedule, d: int) -> tuple[float, float]:
    """(this morning's wake, tonight's bedtime), hours after day d's midnight."""
    last, tonight = schedule.get(d - 1), schedule.get(d)
    wake = last[-1].wake - 24 * d if last else hrv.SLEEP_END_H
    bed = tonight[0].bed - 24 * d if tonight else hrv.SLEEP_START_H
    return wake, bed


def _bouts(
    rng: random.Random, walker: Walker, shape: Shape, wake: float, *, weekend: bool
) -> list[float | None]:
    """Cadence bonus for each minute of the day that is part of a walk, else None.

    Always makes the same draws, so the noise stays aligned across scenarios.
    """
    am_z, pm_z, am_len_z, pm_len_z = (rng.gauss(0, 1) for _ in range(4))
    leisure_u, leisure_z, leisure_len_z = rng.random(), rng.gauss(0, 1), rng.gauss(0, 1)
    ex_u, ex_start_u, ex_len_u = rng.random(), rng.random(), rng.random()

    walks: list[tuple[float, float, float]] = []  # (start hour, minutes, cadence bonus)
    if weekend:
        if leisure_u < LEISURE_PROB:
            length = 2 * walker.commute_min * shape.bouts * math.exp(0.3 * leisure_len_z)
            walks.append((wake + 4.0 + 1.5 * leisure_z, length, 0.0))
    else:
        commute = walker.commute_min * shape.bouts
        walks.append((wake + 1.0 + 0.25 * am_z, commute * math.exp(0.2 * am_len_z), 0.0))
        walks.append((wake + 10.0 + 0.5 * pm_z, commute * math.exp(0.2 * pm_len_z), 0.0))
    if ex_u < walker.exercise_prob * shape.exercise:
        length = EXERCISE_MIN[0] + (EXERCISE_MIN[1] - EXERCISE_MIN[0]) * ex_len_u
        walks.append((wake + 9.0 + 3.5 * ex_start_u, length, EXERCISE_BONUS))

    minutes: list[float | None] = [None] * 1440
    for begin_h, length, bonus in walks:
        begin = round(60 * begin_h)
        for k in range(max(begin, 0), min(begin + round(length), 1440)):
            minutes[k] = max(minutes[k] or 0.0, bonus)
    return minutes


def _shape(scenario: str, d: int, days: int) -> Shape:
    """Scenario change for day index d."""
    if scenario == "stress_period":
        i = hrv.stress_intensity(d, days)
        return Shape(incidental=1 - 0.3 * i, bouts=1 - 0.2 * i, exercise=1 - 0.8 * i)
    if scenario == "withdrawal":
        onset = round(days / 3)
        r = _clamp((d - onset) / max(days - 1 - onset, 1), (0.0, 1.0))
        return Shape(incidental=1 - 0.55 * r, bouts=1 - 0.8 * r, exercise=1 - r)
    if scenario == "sudden_drop":
        drop = days // 2
        if d < drop:
            return Shape()
        k = math.exp(-(d - drop) / 1.5)
        return Shape(incidental=1 - 0.7 * k, bouts=1 - k, exercise=1 - k)
    if scenario == "late_sleep_shift":
        bed, _ = hrv.default_night(scenario, d - 1)
        return Shape(exercise=1 - 0.1 * (bed - hrv.SLEEP_START_H))
    if scenario == "oversleep":
        r = _clamp((d - 1 - round(days / 3)) / 5, (0.0, 1.0))  # sleep oversleep, last night
        return Shape(incidental=1 - 0.3 * r, bouts=1 - 0.3 * r, exercise=1 - 0.7 * r)
    return Shape()


def _clamp(value: float, bounds: tuple[float, float]) -> float:
    return min(max(value, bounds[0]), bounds[1])


# --- CLI -------------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Simulate steps into activity_samples.")
    who = parser.add_mutually_exclusive_group(required=True)
    who.add_argument("--user", type=uuid.UUID, help="existing user id")
    who.add_argument("--new-user", metavar="NAME", help="create a user with this display name")
    parser.add_argument("--scenario", choices=SCENARIOS, default="stable_average")
    parser.add_argument("--days", type=int, default=21)
    parser.add_argument(
        "--start",
        type=date.fromisoformat,
        help="first UTC day, YYYY-MM-DD (default: so the last day is today)",
    )
    parser.add_argument("--interval", type=int, default=15, help="minutes per sample")
    parser.add_argument("--artifacts", action="store_true", help="drop gaps and some days")
    parser.add_argument("--seed", type=int)
    parser.add_argument(
        "--no-replace",
        action="store_true",
        help="keep earlier activity simulator data instead of clearing it",
    )
    args = parser.parse_args(argv)

    from app.db import get_session

    start = args.start or datetime.now(UTC).date() - timedelta(days=args.days - 1)
    with get_session() as s:
        user_id = args.user or repo.create_user(s, args.new_user)
        n = simulate(
            s,
            user_id,
            start,
            args.days,
            args.scenario,
            replace=not args.no_replace,
            artifacts=args.artifacts,
            interval_min=args.interval,
            seed=args.seed,
        )
    end = start + timedelta(days=args.days - 1)
    print(f"user {user_id}: wrote {n} activity samples ({args.scenario}, {start} .. {end})")


if __name__ == "__main__":
    main()
