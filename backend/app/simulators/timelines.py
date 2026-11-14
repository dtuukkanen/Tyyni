"""Scenario timelines shared across simulators.

Scenarios with the same name (stress_period, sudden_drop, withdrawal, oversleep,
late_sleep_shift) follow the same day-by-day timeline in every simulator, so generating them
for one user with the same `days` lines the inputs up. Each simulator decides how strongly
its own signal reacts; these functions only say when and how much, on a 0..1 scale.

d is a day index from 0; a night index n is the night starting on the evening of day n.
"""

from __future__ import annotations

import math

from app.simulators.common import clamp, interp


def stress_intensity(d: int, days: int) -> float:
    """stress_period, 0..1: normal first third, 2-day onset, hold, 3-day recovery."""
    onset = round(days / 3)
    end = onset + max(3, days // 3)
    return interp(d, [(onset, 0.0), (onset + 2, 1.0), (end, 1.0), (end + 3, 0.0)])


def decline(d: int, days: int) -> float:
    """withdrawal / crisis, 0..1: normal first third, then a linear ramp to 1 on the last day."""
    onset = round(days / 3)
    return clamp((d - onset) / max(days - 1 - onset, 1))


def drop_day(days: int) -> int:
    """sudden_drop: the day of the drop, mid-period."""
    return days // 2


def sudden_drop(d: int, days: int, recovery_days: float = 1.5) -> float:
    """sudden_drop, 0..1: 0 before the drop day, 1 on it, then exponential recovery."""
    drop = drop_day(days)
    return math.exp(-(d - drop) / recovery_days) if d >= drop else 0.0


def oversleep(night: int, days: int) -> float:
    """oversleep, 0..1: normal first third, then a 5-night ramp into sleeping long and late."""
    return clamp((night - round(days / 3)) / 5)


def late_sleep_shift(night: int) -> float:
    """late_sleep_shift: hours night n is shifted later, +30 min a night up to 3 h."""
    return min(max(0.5 * night, 0.0), 3.0)
