"""HRV (RMSSD) + heart-rate simulator (#6).

Produces `heart_samples` rows at a fixed interval for one user. All randomness comes from
one seeded RNG whose draws do not depend on the scenario, so two scenarios generated with
the same seed share the same noise and differ only by their shape.

Signal, in log space so values stay positive and roughly log-normal:

    log rmssd = log level + day factor + intraday factor + night gain * asleep + noise

- level: waking RMSSD / resting HR for a high, average or low HRV person.
- day factor: multi-day shape (rising, lowering, alternating, stress period, sudden drop).
- intraday factor: shape within each day's waking hours (rising, lowering, alternating).
- night gain: RMSSD is ~30 % higher while asleep (23:00-07:00 UTC by default, or the real
  nights from the sleep simulator when `nights` is passed; see `sleep_window`).
- noise: a per-day offset plus AR(1) noise between samples.
HR follows HRV inversely (hr ~ rmssd^-0.35) plus a small waking bump.

Times are UTC, matching the UTC calendar days used by `repository.daily_metrics`.

Run: python -m app.simulators.hrv --new-user demo --scenario stress_period --days 21
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
from app.simulators.common import clamp, lerp
from app.simulators.sleep_window import Schedule, asleep_at, sleep_schedule, waking_window

SCENARIOS = (
    "stable_high",
    "stable_average",
    "stable_low",
    "alternating",
    "rising",
    "lowering",
    "stress_period",
    "sudden_drop",
    "late_sleep_shift",
)
PATTERNS = ("alternating", "rising", "lowering")  # the scenarios that take a timescale
TIMESCALES = ("days", "intraday")
SOURCE_PREFIX = "simulator:hrv"


@dataclass(frozen=True)
class Level:
    rmssd_ms: float  # typical waking RMSSD
    hr_bpm: float  # resting HR; waking adds a few bpm


LEVELS = {
    "high": Level(rmssd_ms=75.0, hr_bpm=55.0),
    "average": Level(rmssd_ms=45.0, hr_bpm=63.0),
    "low": Level(rmssd_ms=22.0, hr_bpm=72.0),
}

RMSSD_RANGE = (8.0, 200.0)
HR_RANGE = (40.0, 180.0)

NIGHT_GAIN = math.log(1.30)  # RMSSD +30 % while asleep, scaled by the night's recovery
WAKING_HR_BUMP = 4.0  # bpm added while awake
HR_EXPONENT = 0.35  # hr ~ rmssd ** -HR_EXPONENT

DAY_OFFSET_SD = 0.08  # day-to-day noise, log space
AR_SD = 0.12  # within-day noise (stationary SD), log space
AR_PHI_5MIN = 0.8  # AR(1) autocorrelation per 5 minutes
HR_NOISE_SD = 1.5  # bpm

OUTLIER_PROB = 0.01  # chance a sample is a spike artifact


def generate(
    user_id: uuid.UUID,
    start: date,
    days: int,
    scenario: str = "stable_average",
    *,
    timescale: str = "days",
    artifacts: bool = False,
    interval_min: int = 5,
    seed: int | None = None,
    nights: Sequence[Mapping[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """Heart samples for `days` UTC days starting at `start`, shaped for insert_heart_samples.

    timescale applies to alternating / rising / lowering: "days" shapes the whole period,
    "intraday" repeats the shape within each day's waking hours (daily averages stay flat).
    artifacts adds sensor gaps and outlier spikes.
    nights: sleep sessions ({bedtime, wake_time[, efficiency]}, e.g. from `sleep.nights`) to
    use instead of the built-in sleep window. Poorer nights restore less HRV; time not
    covered by any night counts as awake.
    """
    common.check_args(scenario, SCENARIOS, days, interval_min)
    if timescale not in TIMESCALES:
        raise ValueError(f"unknown timescale {timescale!r}; choose from {TIMESCALES}")

    level = common.profile(scenario, LEVELS)
    rng, artifact_rng = common.rngs(seed)

    phi = AR_PHI_5MIN ** (interval_min / 5)
    innovation_sd = AR_SD * math.sqrt(1 - phi**2)
    ar = rng.gauss(0, AR_SD)
    per_day = 1440 // interval_min
    origin = common.midnight(start)
    source = f"{SOURCE_PREFIX}:{scenario}"
    schedule = sleep_schedule(days, origin, nights, scenario)

    rows: list[dict[str, Any]] = []
    for d in range(days):
        day_log = _day_log_factor(scenario, timescale, d, days)
        day_offset = rng.gauss(0, DAY_OFFSET_SD)
        gap = common.draw_gap(artifact_rng) if artifacts else None
        for k in range(per_day):
            ar = phi * ar + rng.gauss(0, innovation_sd)
            hr_noise = rng.gauss(0, HR_NOISE_SD)
            spike = artifact_rng.random() < OUTLIER_PROB if artifacts else False
            spike_up = artifact_rng.random() < 0.5 if spike else False

            hour = k * interval_min / 60
            if gap and gap[0] <= hour < gap[1]:
                continue

            asleep, recovery = asleep_at(schedule, d, hour)
            dev = (
                day_log
                + _intraday_log_factor(scenario, timescale, schedule, d, hour, asleep)
                + NIGHT_GAIN * recovery * asleep
                + day_offset
                + ar
            )
            rmssd = level.rmssd_ms * math.exp(dev)
            hr = (
                level.hr_bpm * math.exp(-HR_EXPONENT * dev)
                + WAKING_HR_BUMP * (1 - asleep)
                + hr_noise
            )
            if spike:
                rmssd *= 2.5 if spike_up else 0.3
            rows.append(
                {
                    "user_id": user_id,
                    "ts": origin + timedelta(days=d, minutes=k * interval_min),
                    "hr_bpm": round(clamp(hr, HR_RANGE), 1),
                    "hrv_rmssd_ms": round(clamp(rmssd, RMSSD_RANGE), 1),
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
    """Generate and write heart samples. replace=True first clears earlier HRV simulator data."""
    rows = generate(user_id, start, days, scenario, **kwargs)
    return common.write(
        session,
        user_id,
        SOURCE_PREFIX,
        rows,
        repo.insert_heart_samples,
        replace=replace,
        chunk_size=chunk_size,
    )


# --- Shapes ----------------------------------------------------------------------------


def _day_log_factor(scenario: str, timescale: str, d: int, days: int) -> float:
    """Multi-day shape for day index d, in log space (0 = baseline)."""
    q = d / (days - 1) if days > 1 else 0.0
    if timescale == "days":
        if scenario == "rising":
            return lerp(math.log(0.75), math.log(1.25), q)
        if scenario == "lowering":
            return lerp(math.log(1.25), math.log(0.75), q)
        if scenario == "alternating":
            return math.log(1.25) if d % 2 == 0 else math.log(0.8)
    if scenario == "stress_period":
        return math.log(0.6) * timelines.stress_intensity(d, days)
    if scenario == "sudden_drop":
        return math.log(1 - 0.5 * timelines.sudden_drop(d, days, recovery_days=2))
    if scenario == "late_sleep_shift":  # later nights cost a little HRV
        return math.log(1 - 0.02 * timelines.late_sleep_shift(d))
    return 0.0


def _intraday_log_factor(
    scenario: str, timescale: str, schedule: Schedule, d: int, hour: float, asleep: float
) -> float:
    """Within-day shape over waking hours, symmetric in log space so the daily mean is kept."""
    if timescale != "intraday" or scenario not in PATTERNS:
        return 0.0
    wake, bed = waking_window(schedule, d)
    p = clamp((hour - wake) / max(bed - wake, 1.0))
    if scenario == "rising":
        shape = math.log(1.25) * (2 * p - 1)
    elif scenario == "lowering":
        shape = math.log(1.25) * (1 - 2 * p)
    else:  # ~3 h stress / 3 h rest blocks
        shape = math.log(1.2) * math.tanh(3 * math.sin(2 * math.pi * hour / 6))
    return (1 - asleep) * shape


# --- CLI -------------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> None:
    parser = common.parser(
        "Simulate HRV + heart rate into heart_samples.",
        SCENARIOS,
        "stable_average",
        artifacts_help="add sensor gaps and spikes",
        replace_help="keep earlier HRV simulator data instead of clearing it",
    )
    parser.add_argument(
        "--timescale",
        choices=TIMESCALES,
        default="days",
        help="for alternating/rising/lowering: across days or within each day",
    )
    parser.add_argument("--interval", type=int, default=5, help="minutes between samples")
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
            timescale=args.timescale,
            artifacts=args.artifacts,
            interval_min=args.interval,
            seed=args.seed,
        )
    print(f"user {user_id}: wrote {n} samples ({args.scenario}, {start} .. {end})")


if __name__ == "__main__":
    main()
