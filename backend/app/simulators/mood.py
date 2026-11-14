"""Daily mood check-in simulator.

Produces `mood_checkins` rows: the 1-tap check-in, a score from 1 (bad) to 5 (good), at most
once a day in the evening. The mood is the user's own ground truth, so the inference and
learning loop need it in every simulated demo.

Each day has a latent mood on the 1..5 scale:

    mood = person level + scenario shift + sleep effect + weekend bump + noise

- person level: a good, average or low baseline mood.
- scenario shift: same timelines as the other simulators (stress_period, withdrawal,
  sudden_drop, oversleep, late_sleep_shift) plus crisis, which declines like the journal's.
- sleep effect: last night's recovery (from the built-in `sleep_window`, or the real nights
  passed as `nights`, e.g. `sleep.nights(...)`) lifts or lowers the mood.
- noise: AR(1) from day to day, since a bad day tends to follow a bad day.

The score is the latent mood rounded and clamped to 1..5. The user checks in on most days,
less often while withdrawing, 0.5-2.5 h before bed but never after midnight UTC, so each
check-in counts toward its own day. artifacts drops 2-4 day streaks (app not opened) and adds the
odd double tap (a second identical check-in a minute later); the other rows are unchanged.

All randomness comes from one seeded RNG with a fixed number of draws per day, so two
scenarios generated with the same seed share the same noise and differ only by their shape.

Times are UTC.

Run: python -m app.simulators.mood --new-user demo --scenario stress_period --days 21
"""

from __future__ import annotations

import math
import uuid
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.db import repository as repo
from app.simulators import common, timelines
from app.simulators.sleep_window import sleep_schedule, waking_window

SCENARIOS = (
    "stable_good",
    "stable_average",
    "stable_low",
    "stress_period",
    "withdrawal",
    "sudden_drop",
    "late_sleep_shift",
    "oversleep",
    "crisis",
)
SOURCE_PREFIX = "simulator:mood"


@dataclass(frozen=True)
class Person:
    level: float  # usual latent mood, 1..5
    sd: float  # day-to-day spread of the mood


PERSONS = {
    "good": Person(level=4.0, sd=0.55),
    "average": Person(level=3.4, sd=0.6),
    "low": Person(level=2.5, sd=0.65),
}

CHECKIN_PROB = 0.85  # chance the user checks in on a given day
AR_PHI = 0.5  # day-to-day persistence of the mood noise
WEEKEND_BUMP = 0.2  # Saturdays and Sundays feel a bit better
SLEEP_GAIN = 1.5  # mood change per unit of last night's recovery above / below 1.0
LATEST_CHECKIN_H = 23.75  # check-in time cap, hours after midnight UTC

STREAK_PROB = 0.08  # artifacts: chance a 2-4 day streak without check-ins starts on a day
DOUBLE_TAP_PROB = 0.05  # artifacts: chance a check-in is sent twice


@dataclass(frozen=True)
class Shape:
    """How a scenario changes one day, relative to the person's usual day."""

    mood: float = 0.0  # shift of the latent mood
    checkin: float = 1.0  # factor on the check-in probability


def generate(
    user_id: uuid.UUID,
    start: date,
    days: int,
    scenario: str = "stable_average",
    *,
    artifacts: bool = False,
    seed: int | None = None,
    nights: Sequence[Mapping[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """Mood check-ins for `days` UTC days from `start`, shaped for insert_mood_checkins.

    artifacts drops streaks of days and adds double taps; the other rows are unchanged.
    nights: sleep sessions ({bedtime, wake_time[, efficiency]}, e.g. from `sleep.nights`) that
    set the evening check-in time and last night's recovery instead of the built-in window.
    """
    common.check_args(scenario, SCENARIOS, days)
    person = common.profile(scenario, PERSONS)
    rng, artifact_rng = common.rngs(seed)
    origin = common.midnight(start)
    schedule = sleep_schedule(days, origin, nights, scenario)
    source = f"{SOURCE_PREFIX}:{scenario}"

    innovation_sd = person.sd * math.sqrt(1 - AR_PHI**2)
    ar = rng.gauss(0, person.sd)
    skip_until = -1
    rows: list[dict[str, Any]] = []
    for d in range(days):
        day = start + timedelta(days=d)
        shape = _shape(scenario, d, days)
        ar = AR_PHI * ar + rng.gauss(0, innovation_sd)
        checkin_u, time_u = rng.random(), rng.random()
        streak_u, streak_len_u, double_u = (artifact_rng.random() for _ in range(3))

        last_night = schedule.get(d - 1)
        recovery = last_night[-1].recovery if last_night else 1.0
        mood = (
            person.level
            + shape.mood
            + SLEEP_GAIN * (recovery - 1.0)
            + (WEEKEND_BUMP if day.weekday() >= 5 else 0.0)
            + ar
        )

        if artifacts and d > skip_until and streak_u < STREAK_PROB:
            skip_until = d + 1 + math.floor(3 * streak_len_u)  # 2-4 days, today included
        if checkin_u >= CHECKIN_PROB * shape.checkin or (artifacts and d <= skip_until):
            continue

        wake, bed = waking_window(schedule, d)
        # evening, but before midnight so the check-in counts toward its own UTC day
        hour = min(max(bed - 0.5 - 2.0 * time_u, wake + 1.0), LATEST_CHECKIN_H)
        row = {
            "user_id": user_id,
            "ts": origin + timedelta(days=d, minutes=round(60 * hour)),
            "score": _score(mood),
            "source": source,
        }
        rows.append(row)
        if artifacts and double_u < DOUBLE_TAP_PROB:
            rows.append({**row, "ts": row["ts"] + timedelta(minutes=1)})
    return rows


def simulate(
    session: Session,
    user_id: uuid.UUID,
    start: date,
    days: int,
    scenario: str = "stable_average",
    *,
    replace: bool = True,
    **kwargs: Any,
) -> int:
    """Generate and write mood check-ins. replace=True first clears earlier simulator check-ins;
    check-ins made in the app are kept."""
    rows = generate(user_id, start, days, scenario, **kwargs)
    return common.write(
        session, user_id, SOURCE_PREFIX, rows, repo.insert_mood_checkins, replace=replace
    )


def _score(mood: float) -> int:
    """Latent mood rounded half up and clamped to the 1..5 scale."""
    return min(max(math.floor(mood + 0.5), 1), 5)


def _shape(scenario: str, d: int, days: int) -> Shape:
    """Scenario change for day index d."""
    if scenario == "stress_period":
        return Shape(mood=-1.3 * timelines.stress_intensity(d, days))
    if scenario == "withdrawal":
        r = timelines.decline(d, days)
        return Shape(mood=-1.2 * r, checkin=1 - 0.5 * r)
    if scenario == "sudden_drop":
        return Shape(mood=-2.2 * timelines.sudden_drop(d, days))
    if scenario == "late_sleep_shift":  # last night's shift, on top of its poorer recovery
        return Shape(mood=-0.1 * timelines.late_sleep_shift(d - 1))
    if scenario == "oversleep":  # last night's oversleep
        return Shape(mood=-0.8 * timelines.oversleep(d - 1, days))
    if scenario == "crisis":
        r = timelines.decline(d, days)
        return Shape(mood=-2.2 * r, checkin=1 - 0.3 * r)
    return Shape()


# --- CLI -------------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> None:
    parser = common.parser(
        "Simulate daily 1-tap mood check-ins.",
        SCENARIOS,
        "stable_average",
        artifacts_help="drop streaks of days and add double taps",
        replace_help="keep earlier mood simulator check-ins instead of clearing them",
    )
    args = parser.parse_args(argv)

    from app.db import get_session

    start, end = common.period(args)
    with get_session() as s:
        user_id = common.user(s, args)
        n = simulate(
            s,
            user_id,
            start,
            args.days,
            args.scenario,
            replace=not args.no_replace,
            artifacts=args.artifacts,
            seed=args.seed,
        )
    print(f"user {user_id}: wrote {n} mood check-ins ({args.scenario}, {start} .. {end})")


if __name__ == "__main__":
    main()
