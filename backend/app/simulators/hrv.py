"""HRV (RMSSD) + heart-rate simulator (#6).

Produces `heart_samples` rows at a fixed interval for one user. All randomness comes from
one seeded RNG whose draws do not depend on the scenario, so two scenarios generated with
the same seed share the same noise and differ only by their shape.

Signal, in log space so values stay positive and roughly log-normal:

    log rmssd = log level + day factor + intraday factor + night gain * asleep + noise

- level: waking RMSSD / resting HR for a high, average or low HRV person.
- day factor: multi-day shape (rising, lowering, alternating, stress period, sudden drop).
- intraday factor: shape within each day's waking hours (rising, lowering, alternating).
- night gain: RMSSD is ~30 % higher while asleep (23:00-07:00 UTC by default).
- noise: a per-day offset plus AR(1) noise between samples.
HR follows HRV inversely (hr ~ rmssd^-0.35) plus a small waking bump.

Times are UTC, matching the UTC calendar days used by `repository.daily_metrics`.

Run: python -m app.simulators.hrv --new-user demo --scenario stress_period --days 21
"""

from __future__ import annotations

import argparse
import itertools
import math
import random
import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.db import repository as repo

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

SLEEP_START_H = 23.0  # bedtime, hours after midnight UTC
SLEEP_END_H = 7.0  # wake time, next morning
SLEEP_EDGE_H = 0.4  # width of the sigmoid falling-asleep / waking transition
NIGHT_GAIN = math.log(1.30)  # RMSSD +30 % while asleep
WAKING_HR_BUMP = 4.0  # bpm added while awake
HR_EXPONENT = 0.35  # hr ~ rmssd ** -HR_EXPONENT

DAY_OFFSET_SD = 0.08  # day-to-day noise, log space
AR_SD = 0.12  # within-day noise (stationary SD), log space
AR_PHI_5MIN = 0.8  # AR(1) autocorrelation per 5 minutes
HR_NOISE_SD = 1.5  # bpm

GAP_DAY_PROB = 0.5  # chance a day has a 1-3 h gap (watch off)
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
) -> list[dict[str, Any]]:
    """Heart samples for `days` UTC days starting at `start`, shaped for insert_heart_samples.

    timescale applies to alternating / rising / lowering: "days" shapes the whole period,
    "intraday" repeats the shape within each day's waking hours (daily averages stay flat).
    artifacts adds sensor gaps and outlier spikes.
    """
    if scenario not in SCENARIOS:
        raise ValueError(f"unknown scenario {scenario!r}; choose from {SCENARIOS}")
    if timescale not in TIMESCALES:
        raise ValueError(f"unknown timescale {timescale!r}; choose from {TIMESCALES}")
    if days < 1:
        raise ValueError("days must be >= 1")
    if interval_min < 1 or 1440 % interval_min:
        raise ValueError("interval_min must divide a day (e.g. 1, 5, 10, 15, 30, 60)")

    level = (
        LEVELS[scenario.removeprefix("stable_")]
        if scenario.startswith("stable_")
        else LEVELS["average"]
    )
    rng = random.Random(seed)
    artifact_rng = random.Random(rng.random())  # own stream: artifacts never shift the signal noise

    phi = AR_PHI_5MIN ** (interval_min / 5)
    innovation_sd = AR_SD * math.sqrt(1 - phi**2)
    ar = rng.gauss(0, AR_SD)
    per_day = 1440 // interval_min
    origin = datetime(start.year, start.month, start.day, tzinfo=UTC)
    source = f"{SOURCE_PREFIX}:{scenario}"

    rows: list[dict[str, Any]] = []
    for d in range(days):
        day_log = _day_log_factor(scenario, timescale, d, days)
        day_offset = rng.gauss(0, DAY_OFFSET_SD)
        gap = _draw_gap(artifact_rng) if artifacts else None
        for k in range(per_day):
            ar = phi * ar + rng.gauss(0, innovation_sd)
            hr_noise = rng.gauss(0, HR_NOISE_SD)
            spike = artifact_rng.random() < OUTLIER_PROB if artifacts else False
            spike_up = artifact_rng.random() < 0.5 if spike else False

            hour = k * interval_min / 60
            if gap and gap[0] <= hour < gap[1]:
                continue

            asleep, night_gain = _asleep(scenario, d, hour)
            dev = (
                day_log
                + _intraday_log_factor(scenario, timescale, d, hour, asleep)
                + night_gain * asleep
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
                    "hr_bpm": round(_clamp(hr, HR_RANGE), 1),
                    "hrv_rmssd_ms": round(_clamp(rmssd, RMSSD_RANGE), 1),
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
    if replace:
        repo.delete_source_data(session, user_id, SOURCE_PREFIX)
    for i in range(0, len(rows), chunk_size):
        repo.insert_heart_samples(session, rows[i : i + chunk_size])
    return len(rows)


# --- Shapes ----------------------------------------------------------------------------


def _day_log_factor(scenario: str, timescale: str, d: int, days: int) -> float:
    """Multi-day shape for day index d, in log space (0 = baseline)."""
    q = d / (days - 1) if days > 1 else 0.0
    if timescale == "days":
        if scenario == "rising":
            return _lerp(math.log(0.75), math.log(1.25), q)
        if scenario == "lowering":
            return _lerp(math.log(1.25), math.log(0.75), q)
        if scenario == "alternating":
            return math.log(1.25) if d % 2 == 0 else math.log(0.8)
    if scenario == "stress_period":
        onset = round(days / 3)
        end = onset + max(3, days // 3)
        low = math.log(0.6)
        return _interp(d, [(onset, 0.0), (onset + 2, low), (end, low), (end + 3, 0.0)])
    if scenario == "sudden_drop":
        drop = days // 2
        return 0.0 if d < drop else math.log(1 - 0.5 * math.exp(-(d - drop) / 2))
    if scenario == "late_sleep_shift":
        return math.log(1 - 0.02 * _sleep_shift(scenario, d))  # later nights cost a little HRV
    return 0.0


def _intraday_log_factor(
    scenario: str, timescale: str, d: int, hour: float, asleep: float
) -> float:
    """Within-day shape over waking hours, symmetric in log space so the daily mean is kept."""
    if timescale != "intraday" or scenario not in PATTERNS:
        return 0.0
    wake = _night(scenario, d - 1)[1] - 24  # this morning's wake time, hours after today's midnight
    bed = _night(scenario, d)[0]
    p = min(max((hour - wake) / (bed - wake), 0.0), 1.0)
    if scenario == "rising":
        shape = math.log(1.25) * (2 * p - 1)
    elif scenario == "lowering":
        shape = math.log(1.25) * (1 - 2 * p)
    else:  # ~3 h stress / 3 h rest blocks
        shape = math.log(1.2) * math.tanh(3 * math.sin(2 * math.pi * hour / 6))
    return (1 - asleep) * shape


def _sleep_shift(scenario: str, night: int) -> float:
    """Hours the night starting on day `night` is shifted later (late_sleep_shift only)."""
    if scenario != "late_sleep_shift":
        return 0.0
    return min(max(0.5 * night, 0.0), 3.0)


def _night(scenario: str, night: int) -> tuple[float, float]:
    """(bedtime, wake) of the night starting on day `night`, hours after that day's midnight."""
    shift = _sleep_shift(scenario, night)
    return SLEEP_START_H + shift, 24 + SLEEP_END_H + 0.8 * shift  # later nights are also shorter


def _asleep(scenario: str, d: int, hour: float) -> tuple[float, float]:
    """(asleep weight 0..1, night gain) at `hour` on day d, from last night and tonight."""
    best = (0.0, NIGHT_GAIN)
    for night, offset in ((d - 1, -24.0), (d, 0.0)):
        bed, wake = _night(scenario, night)
        weight = _sigmoid((hour - bed - offset) / SLEEP_EDGE_H) * _sigmoid(
            (wake + offset - hour) / SLEEP_EDGE_H
        )
        if weight > best[0]:
            gain = NIGHT_GAIN * (
                1 - 0.05 * _sleep_shift(scenario, night)
            )  # later nights restore less
            best = (weight, gain)
    return best


def _draw_gap(rng: random.Random) -> tuple[float, float] | None:
    if rng.random() >= GAP_DAY_PROB:
        return None
    length = rng.uniform(1.0, 3.0)
    begin = rng.uniform(0.0, 24.0 - length)
    return begin, begin + length


# --- Helpers ---------------------------------------------------------------------------


def _sigmoid(x: float) -> float:
    if x < -40:
        return 0.0
    return 1 / (1 + math.exp(-x))


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def _interp(x: float, knots: list[tuple[float, float]]) -> float:
    """Piecewise-linear through knots; flat before the first and after the last."""
    if x <= knots[0][0]:
        return knots[0][1]
    for (x0, y0), (x1, y1) in itertools.pairwise(knots):
        if x <= x1:
            return y1 if x1 == x0 else _lerp(y0, y1, (x - x0) / (x1 - x0))
    return knots[-1][1]


def _clamp(value: float, bounds: tuple[float, float]) -> float:
    return min(max(value, bounds[0]), bounds[1])


# --- CLI -------------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Simulate HRV + heart rate into heart_samples.")
    who = parser.add_mutually_exclusive_group(required=True)
    who.add_argument("--user", type=uuid.UUID, help="existing user id")
    who.add_argument("--new-user", metavar="NAME", help="create a user with this display name")
    parser.add_argument("--scenario", choices=SCENARIOS, default="stable_average")
    parser.add_argument(
        "--timescale",
        choices=TIMESCALES,
        default="days",
        help="for alternating/rising/lowering: across days or within each day",
    )
    parser.add_argument("--days", type=int, default=21)
    parser.add_argument(
        "--start",
        type=date.fromisoformat,
        help="first UTC day, YYYY-MM-DD (default: so the last day is today)",
    )
    parser.add_argument("--interval", type=int, default=5, help="minutes between samples")
    parser.add_argument("--artifacts", action="store_true", help="add sensor gaps and spikes")
    parser.add_argument("--seed", type=int)
    parser.add_argument(
        "--no-replace",
        action="store_true",
        help="keep earlier HRV simulator data instead of clearing it",
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
            timescale=args.timescale,
            artifacts=args.artifacts,
            interval_min=args.interval,
            seed=args.seed,
        )
    end = start + timedelta(days=args.days - 1)
    print(f"user {user_id}: wrote {n} samples ({args.scenario}, {start} .. {end})")


if __name__ == "__main__":
    main()
