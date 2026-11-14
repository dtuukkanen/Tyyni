"""Phone screen time simulator.

Produces `screen_samples` rows: the minutes the phone's screen was on in each interval, as a
phone's screen-time API reports them. Screen time is its own signal (the phone, not the
wearable), so it has its own table and source and lines up with the others through the shared
scenario timelines and sleep schedule.

Each day has a budget, the person's usual daily screen time x scenario x weekend lift x day
noise (log-normal). It is spread over the waking minutes by a usage profile:

- a check in bed right after waking (more when oversleeping),
- a lunch bump and a steady evening rise towards bedtime,
- scrolling in bed in the last hour before sleep (more when bedtime slips),

times slow AR(1) noise, normalised so the day's expected total is the budget (minutes after
midnight before a late bedtime follow the previous evening's profile). Minute by minute
the screen is then on or off, a two-state Markov chain whose sessions last SESSION_MIN minutes
on average and whose on-share follows that spread, so use comes in realistic sessions. Nobody
uses the phone while asleep: the nights come from the built-in `sleep_window` (23:00-07:00
UTC, shifted for late_sleep_shift) or from real sleep sessions passed as `nights`.

All randomness comes from one seeded RNG with a fixed number of draws per day and minute, so
two scenarios generated with the same seed share the same noise and differ only by their shape.

Times are UTC.

Run: python -m app.simulators.screen --new-user demo --scenario withdrawal --days 21
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
from app.simulators.sleep_window import Schedule, asleep_at, sleep_schedule, waking_window

SCENARIOS = (
    "stable_light",
    "stable_average",
    "stable_heavy",
    "stress_period",
    "withdrawal",
    "sudden_drop",
    "late_sleep_shift",
    "oversleep",
)
SOURCE_PREFIX = "simulator:screen"

USERS = {  # usual daily screen time, minutes
    "light": 120.0,
    "average": 210.0,
    "heavy": 330.0,
}

WEEKEND_LIFT = 1.05  # Saturdays and Sundays
DAY_SD = 0.08  # day-to-day noise on the budget, log space
AR_SD = 0.4  # slow within-day noise on the usage rate (stationary SD), log space
AR_PHI = 0.98  # AR(1) autocorrelation per minute
SESSION_MIN = 2.0  # mean length of a screen session, minutes
MAX_ON_SHARE = 1 / (1 + 1 / SESSION_MIN)  # highest on-share the chain can reach

MISSING_DAY_PROB = 0.03  # artifacts: chance a whole day has no data


@dataclass(frozen=True)
class Shape:
    """How a scenario changes one day, relative to the person's usual day."""

    budget: float = 1.0  # daily screen time factor
    morning: float = 1.0  # weight of the check in bed after waking
    bed: float = 1.0  # weight of the scrolling in bed before sleep


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
    """Screen time samples for `days` UTC days from `start`, shaped for insert_screen_samples.

    artifacts drops 1-3 h gaps (phone off) and some whole days; the remaining rows are
    unchanged. nights: sleep sessions ({bedtime, wake_time}, e.g. from `sleep.nights`) to use
    instead of the built-in sleep window; time not covered by any night counts as awake.
    """
    common.check_args(scenario, SCENARIOS, days, interval_min)
    usual = common.profile(scenario, USERS)
    rng, artifact_rng = common.rngs(seed)
    origin = common.midnight(start)
    schedule = sleep_schedule(days, origin, nights, scenario)
    source = f"{SOURCE_PREFIX}:{scenario}"

    innovation_sd = AR_SD * math.sqrt(1 - AR_PHI**2)
    ar = rng.gauss(0, AR_SD)
    rows: list[dict[str, Any]] = []
    for d in range(days):
        day = start + timedelta(days=d)
        shapes = _shape(scenario, d - 1, days), _shape(scenario, d, days)
        windows = waking_window(schedule, d - 1), waking_window(schedule, d)

        day_z = rng.gauss(0, 1)
        noise = []
        for _ in range(1440):
            ar = AR_PHI * ar + rng.gauss(0, innovation_sd)
            noise.append(ar)
        flips = [rng.random() for _ in range(1440)]

        missing_day = artifact_rng.random() < MISSING_DAY_PROB
        gap = common.draw_gap(artifact_rng)

        lift = WEEKEND_LIFT if day.weekday() >= 5 else 1.0
        budget = usual * shapes[1].budget * lift * math.exp(DAY_SD * day_z - DAY_SD**2 / 2)
        weights = [
            _weight(schedule, d, k, windows, shapes) * math.exp(noise[k]) for k in range(1440)
        ]
        total = sum(weights) or 1.0  # never 0 unless asleep all day
        on = False
        minutes = [0] * 1440
        for k in range(1440):
            if weights[k] == 0.0:
                on = False
                continue
            share = min(budget * weights[k] / total, MAX_ON_SHARE)
            stop = 1 / SESSION_MIN
            pick_up = stop * share / (1 - share)
            on = flips[k] >= stop if on else flips[k] < pick_up
            minutes[k] = int(on)

        if artifacts and missing_day:
            continue
        for i in range(0, 1440, interval_min):
            if artifacts and gap and gap[0] <= i / 60 < gap[1]:
                continue
            rows.append(
                {
                    "user_id": user_id,
                    "ts": origin + timedelta(days=d, minutes=i),
                    "screen_time_min": float(sum(minutes[i : i + interval_min])),
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
    """Generate and write screen time samples. replace=True first clears earlier screen
    simulator data; screen time from a device is kept."""
    rows = generate(user_id, start, days, scenario, **kwargs)
    return common.write(
        session,
        user_id,
        SOURCE_PREFIX,
        rows,
        repo.insert_screen_samples,
        replace=replace,
        chunk_size=chunk_size,
    )


# --- Day structure ---------------------------------------------------------------------


def _weight(
    schedule: Schedule,
    d: int,
    k: int,
    windows: tuple[tuple[float, float], tuple[float, float]],
    shapes: tuple[Shape, Shape],
) -> float:
    """Usage weight of minute k of day d, 0 while asleep. windows / shapes are (yesterday's,
    today's); minutes before this morning's wake (after midnight, before a late bedtime) are
    still yesterday's evening."""
    if asleep_at(schedule, d, (k + 0.5) / 60)[0] >= 0.5:  # minute k covers [k, k + 1)
        return 0.0
    hour = k / 60
    evening = hour < windows[1][0]
    (wake, bed), shape = (windows[0], shapes[0]) if evening else (windows[1], shapes[1])
    if evening:
        hour += 24
    return _profile(hour - wake, bed - hour, shape)


def _profile(since_wake_h: float, until_bed_h: float, shape: Shape) -> float:
    """Usage weight over the waking day, relative to the person's usual evening."""
    s, u = since_wake_h, until_bed_h
    return (
        0.5
        + 1.2 * shape.morning * math.exp(-(((s - 0.3) / 0.4) ** 2))  # in bed after waking
        + 0.5 * math.exp(-(((s - 5.5) / 1.0) ** 2))  # lunch
        + 0.6 * common.sigmoid((s - 11.0) / 1.0)  # evening
        + 0.8 * shape.bed * math.exp(-(((u - 0.4) / 0.4) ** 2))  # in bed before sleep
    )


def _shape(scenario: str, d: int, days: int) -> Shape:
    """Scenario change for day index d."""
    if scenario == "stress_period":
        i = timelines.stress_intensity(d, days)
        return Shape(budget=1 + 0.6 * i)
    if scenario == "withdrawal":
        return Shape(budget=1 + 1.2 * timelines.decline(d, days))
    if scenario == "sudden_drop":
        return Shape(budget=1 + 0.8 * timelines.sudden_drop(d, days))
    if scenario == "late_sleep_shift":  # tonight's shift: scrolling pushes bedtime later
        shift = timelines.late_sleep_shift(d)
        return Shape(budget=1 + 0.1 * shift, bed=1 + 0.5 * shift)
    if scenario == "oversleep":  # last night's oversleep: lying in bed with the phone
        r = timelines.oversleep(d - 1, days)
        return Shape(budget=1 + 0.3 * r, morning=1 + 1.5 * r)
    return Shape()


# --- CLI -------------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> None:
    parser = common.parser(
        "Simulate phone screen time into screen_samples.",
        SCENARIOS,
        "stable_average",
        artifacts_help="drop gaps (phone off) and some days",
        replace_help="keep earlier screen simulator data instead of clearing it",
    )
    parser.add_argument("--interval", type=int, default=15, help="minutes per sample")
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
            interval_min=args.interval,
            seed=args.seed,
        )
    print(f"user {user_id}: wrote {n} screen time samples ({args.scenario}, {start} .. {end})")


if __name__ == "__main__":
    main()
