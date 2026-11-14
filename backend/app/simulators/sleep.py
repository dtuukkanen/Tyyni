"""Sleep simulator (#7).

Produces one `sleep_sessions` row per night for one user. A session counts toward the UTC
day the user wakes up (see `repository.daily_metrics`), so `days` days give `days` sessions:
day 0's session is the night that started the evening before `start`.

Each night:

    bedtime = sleeper bedtime + scenario shift + jitter
    wake    = sleeper wake    + scenario shift + jitter (partly follows the bedtime jitter)
    efficiency (time asleep / time in bed) = sleeper efficiency + scenario delta + noise
    stages: deep sleep is front-loaded (~85 min, fairly constant), REM is ~22 % of the time
            asleep (short nights lose it), light is the rest, awake = time in bed - asleep.

All randomness comes from one seeded RNG with a fixed number of draws per night, so two
scenarios generated with the same seed share the same noise and differ only by their shape.
The average sleeper and late_sleep_shift use the HRV simulator's sleep window, and
`nights(...)` can be passed to `hrv.generate(nights=...)` so night-time HRV follows them.

Times are UTC and whole minutes.

Run: python -m app.simulators.sleep --new-user demo --scenario oversleep --days 21 --with-hrv
"""

from __future__ import annotations

import argparse
import math
import random
import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.db import repository as repo
from app.simulators import hrv

SCENARIOS = (
    "stable_good",
    "stable_average",
    "stable_poor",
    "weekend_shift",
    "late_sleep_shift",
    "oversleep",
    "stress_period",
    "short_night",
)
SOURCE_PREFIX = "simulator:sleep"

# HRV scenario that goes with each sleep scenario for --with-hrv (default: stable_average)
HRV_SCENARIO = {
    "stable_good": "stable_high",
    "stable_poor": "stable_low",
    "late_sleep_shift": "late_sleep_shift",
    "stress_period": "stress_period",
    "short_night": "sudden_drop",
}


@dataclass(frozen=True)
class Sleeper:
    bed_h: float  # usual bedtime, hours after midnight of the evening's day
    wake_h: float  # usual wake time, same reference (so > 24)
    efficiency: float  # time asleep / time in bed
    jitter_min: float  # night-to-night SD of bedtime, minutes


SLEEPERS = {
    "good": Sleeper(bed_h=22.75, wake_h=31.0, efficiency=0.92, jitter_min=15.0),
    "average": Sleeper(
        bed_h=hrv.SLEEP_START_H, wake_h=24 + hrv.SLEEP_END_H, efficiency=0.88, jitter_min=25.0
    ),
    "poor": Sleeper(bed_h=23.75, wake_h=30.75, efficiency=0.78, jitter_min=45.0),
}

WAKE_FOLLOWS_BED = 0.5  # share of the bedtime jitter carried into the wake time
WAKE_JITTER = 0.8  # own wake jitter, relative to jitter_min
EFFICIENCY_SD = 0.03
EFFICIENCY_RANGE = (0.5, 0.98)
MIN_IN_BED_MIN = 60
DEEP_MIN = 85.0  # typical deep sleep per night, minutes
DEEP_MAX_SHARE = 0.3  # deep can't exceed this share of the time asleep
REM_SHARE = 0.22
STAGE_SD = 0.1  # log-space noise on deep and REM

MISSING_NIGHT_PROB = 0.1  # artifacts: watch off / charging


@dataclass(frozen=True)
class Shape:
    """How a scenario changes one night, relative to the sleeper's usual night."""

    bed_h: float = 0.0  # bedtime shift, hours (later is positive)
    wake_h: float = 0.0  # wake shift, hours
    efficiency: float = 0.0  # added to efficiency
    deep: float = 1.0  # deep sleep factor
    jitter: float = 1.0  # bedtime/wake jitter factor


def nights(
    start: date,
    days: int,
    scenario: str = "stable_average",
    *,
    seed: int | None = None,
) -> list[dict[str, Any]]:
    """The full sleep schedule around `days` UTC days from `start`, for hrv.generate(nights=).

    days + 1 nights: the one before `start` through the evening of the last day (that last
    night ends after the period). Rows: {bedtime, wake_time, efficiency, stages}.
    """
    return _nights(start, days, scenario, seed)[0]


def generate(
    user_id: uuid.UUID,
    start: date,
    days: int,
    scenario: str = "stable_average",
    *,
    artifacts: bool = False,
    seed: int | None = None,
) -> list[dict[str, Any]]:
    """One sleep session per wake day in [start, start + days), shaped for insert_sleep_session.

    artifacts drops some nights (watch not worn); the remaining nights are unchanged.
    """
    schedule, artifact_rng = _nights(start, days, scenario, seed)
    source = f"{SOURCE_PREFIX}:{scenario}"
    rows = []
    for night in schedule[:days]:
        missing = artifact_rng.random() < MISSING_NIGHT_PROB
        if artifacts and missing:
            continue
        rows.append({"user_id": user_id, **night, "source": source})
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
    """Generate and write sleep sessions. replace=True first clears earlier sleep simulator data."""
    rows = generate(user_id, start, days, scenario, **kwargs)
    if replace:
        repo.delete_source_data(session, user_id, SOURCE_PREFIX)
    for row in rows:
        repo.insert_sleep_session(session, **row)
    return len(rows)


# --- Schedule --------------------------------------------------------------------------


def _nights(
    start: date, days: int, scenario: str, seed: int | None
) -> tuple[list[dict[str, Any]], random.Random]:
    if scenario not in SCENARIOS:
        raise ValueError(f"unknown scenario {scenario!r}; choose from {SCENARIOS}")
    if days < 1:
        raise ValueError("days must be >= 1")

    sleeper = (
        SLEEPERS[scenario.removeprefix("stable_")]
        if scenario.startswith("stable_")
        else SLEEPERS["average"]
    )
    rng = random.Random(seed)
    artifact_rng = random.Random(rng.random())  # own stream: artifacts never shift the noise
    origin = datetime(start.year, start.month, start.day, tzinfo=UTC)

    rows = []
    for n in range(-1, days):  # night n starts on the evening of day n
        bed_z, wake_z, eff_z, deep_z, rem_z = (rng.gauss(0, 1) for _ in range(5))
        shape = _shape(scenario, n, days, start + timedelta(days=n))

        bed_jitter = sleeper.jitter_min * shape.jitter * bed_z
        wake_jitter = WAKE_FOLLOWS_BED * bed_jitter + (
            WAKE_JITTER * sleeper.jitter_min * shape.jitter * wake_z
        )
        bed_min = round(60 * (24 * n + sleeper.bed_h + shape.bed_h) + bed_jitter)
        wake_min = round(60 * (24 * n + sleeper.wake_h + shape.wake_h) + wake_jitter)
        wake_min = max(wake_min, bed_min + MIN_IN_BED_MIN)
        in_bed = wake_min - bed_min

        efficiency = _clamp(
            sleeper.efficiency + shape.efficiency + EFFICIENCY_SD * eff_z, EFFICIENCY_RANGE
        )
        rows.append(
            {
                "bedtime": origin + timedelta(minutes=bed_min),
                "wake_time": origin + timedelta(minutes=wake_min),
                "efficiency": round(efficiency, 3),
                "stages": _stages(in_bed, efficiency, shape.deep, deep_z, rem_z),
            }
        )
    return rows, artifact_rng


def _shape(scenario: str, n: int, days: int, evening: date) -> Shape:
    """Scenario change for night n (starting on the evening of day n, which is `evening`)."""
    if scenario == "weekend_shift":
        if evening.weekday() in (4, 5):  # Friday and Saturday nights
            return Shape(bed_h=1.5, wake_h=2.0)
    elif scenario == "late_sleep_shift":
        bed, wake = hrv.default_night(scenario, n)
        base = SLEEPERS["average"]
        shift = bed - base.bed_h
        return Shape(bed_h=shift, wake_h=wake - base.wake_h, efficiency=-0.01 * shift)
    elif scenario == "oversleep":
        r = _clamp((n - round(days / 3)) / 5, (0.0, 1.0))
        return Shape(bed_h=1.5 * r, wake_h=3.5 * r, efficiency=-0.06 * r)
    elif scenario == "stress_period":
        i = hrv.stress_intensity(n, days)
        return Shape(
            bed_h=0.75 * i,
            wake_h=-0.5 * i,
            efficiency=-0.15 * i,
            deep=1 - 0.3 * i,
            jitter=1 + 0.5 * i,
        )
    elif scenario == "short_night":
        drop = days // 2 - 1  # wakes on day days // 2, the HRV sudden_drop day
        if n == drop:
            return Shape(bed_h=3.5, wake_h=-1.0, jitter=0.3)  # 02:30 - 06:00
        if n == drop + 1:
            return Shape(bed_h=-1.0, wake_h=0.5)  # rebound
    return Shape()


def _stages(
    in_bed: int, efficiency: float, deep_factor: float, deep_z: float, rem_z: float
) -> dict[str, int]:
    """Minutes per stage; deep + rem + light + awake == in_bed."""
    asleep = round(in_bed * efficiency)
    deep = round(min(DEEP_MIN * deep_factor * math.exp(STAGE_SD * deep_z), DEEP_MAX_SHARE * asleep))
    rem = min(round(REM_SHARE * asleep * math.exp(STAGE_SD * rem_z)), asleep - deep)
    return {"deep": deep, "rem": rem, "light": asleep - deep - rem, "awake": in_bed - asleep}


def _clamp(value: float, bounds: tuple[float, float]) -> float:
    return min(max(value, bounds[0]), bounds[1])


# --- CLI -------------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Simulate sleep sessions into sleep_sessions.")
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
    parser.add_argument("--artifacts", action="store_true", help="drop some nights (watch off)")
    parser.add_argument("--seed", type=int)
    parser.add_argument(
        "--no-replace",
        action="store_true",
        help="keep earlier simulator data instead of clearing it",
    )
    parser.add_argument(
        "--with-hrv",
        action="store_true",
        help="also write HRV + heart rate whose night-time rise follows these nights",
    )
    parser.add_argument(
        "--hrv-scenario",
        choices=hrv.SCENARIOS,
        help="HRV scenario for --with-hrv (default: matched to --scenario)",
    )
    args = parser.parse_args(argv)

    from app.db import get_session

    start = args.start or datetime.now(UTC).date() - timedelta(days=args.days - 1)
    # nights() for HRV must see the same schedule as the sessions, so always fix a seed
    seed = args.seed if args.seed is not None else random.randrange(2**32)
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
            seed=seed,
        )
        if args.with_hrv:
            hrv_scenario = args.hrv_scenario or HRV_SCENARIO.get(args.scenario, "stable_average")
            n_hrv = hrv.simulate(
                s,
                user_id,
                start,
                args.days,
                hrv_scenario,
                replace=not args.no_replace,
                seed=seed,
                nights=nights(start, args.days, args.scenario, seed=seed),
            )
    end = start + timedelta(days=args.days - 1)
    print(f"user {user_id}: wrote {n} sleep sessions ({args.scenario}, {start} .. {end})")
    if args.with_hrv:
        print(f"user {user_id}: wrote {n_hrv} heart samples ({hrv_scenario}, same nights)")


if __name__ == "__main__":
    main()
