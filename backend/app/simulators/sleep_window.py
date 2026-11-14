"""When the simulated user is asleep, shared by the HRV, activity,
screen, mood and journal simulators.

A schedule is either the built-in window (23:00-07:00 UTC, shifted later for
late_sleep_shift) or real sleep sessions, e.g. from `sleep.nights(...)`. Time not covered by
any night counts as awake.
"""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from app.simulators import timelines
from app.simulators.common import clamp, sigmoid

SLEEP_START_H = 23.0  # bedtime, hours after midnight UTC
SLEEP_END_H = 7.0  # wake time, next morning
SLEEP_EDGE_H = 0.4  # width of the sigmoid falling-asleep / waking transition
REFERENCE_EFFICIENCY = 0.88  # sleep efficiency of a typical night (recovery 1.0)
RECOVERY_RANGE = (0.6, 1.1)


@dataclass(frozen=True)
class Night:
    bed: float  # hours after the origin (midnight of the first day)
    wake: float
    recovery: float  # how restful the night is, 1.0 = typical


Schedule = dict[int, list[Night]]  # keyed by the day the night starts on


def default_night(shift: float = 0.0) -> tuple[float, float]:
    """(bedtime, wake) of the built-in night shifted `shift` h later, hours after the
    evening's midnight. Later nights are also shorter."""
    return SLEEP_START_H + shift, 24 + SLEEP_END_H + 0.8 * shift


def sleep_schedule(
    days: int,
    origin: datetime,
    nights: Sequence[Mapping[str, Any]] | None = None,
    scenario: str = "",
) -> Schedule:
    """Nights around `days` days from `origin`: the given sleep sessions ({bedtime, wake_time
    [, efficiency]}), or the built-in window when `nights` is None (shifted later when
    scenario is late_sleep_shift)."""
    if nights is not None:
        return _schedule_from(nights, origin)
    late = scenario == "late_sleep_shift"
    schedule: Schedule = {}
    for n in range(-1, days):
        shift = timelines.late_sleep_shift(n) if late else 0.0
        bed, wake = default_night(shift)
        schedule[n] = [Night(24 * n + bed, 24 * n + wake, 1 - 0.05 * shift)]
    return schedule


def _schedule_from(nights: Sequence[Mapping[str, Any]], origin: datetime) -> Schedule:
    schedule: Schedule = {}
    for row in sorted(nights, key=lambda r: r["bedtime"]):
        bed = (row["bedtime"] - origin).total_seconds() / 3600
        wake = (row["wake_time"] - origin).total_seconds() / 3600
        efficiency = row.get("efficiency") or REFERENCE_EFFICIENCY
        recovery = clamp(efficiency / REFERENCE_EFFICIENCY, RECOVERY_RANGE)
        n = math.floor(wake / 24) - 1  # the night that ends on day k starts on day k - 1
        schedule.setdefault(n, []).append(Night(bed, wake, recovery))
    return schedule


def waking_window(schedule: Schedule, d: int) -> tuple[float, float]:
    """(this morning's wake, tonight's bedtime), hours after day d's midnight."""
    last, tonight = schedule.get(d - 1), schedule.get(d)
    wake = last[-1].wake - 24 * d if last else SLEEP_END_H
    bed = tonight[0].bed - 24 * d if tonight else SLEEP_START_H
    return wake, bed


def asleep_at(schedule: Schedule, d: int, hour: float) -> tuple[float, float]:
    """(asleep weight 0..1, that night's recovery) at `hour` on day d."""
    t = 24 * d + hour
    best = (0.0, 1.0)
    for n in (d - 1, d):
        for night in schedule.get(n, ()):
            weight = sigmoid((t - night.bed) / SLEEP_EDGE_H) * sigmoid(
                (night.wake - t) / SLEEP_EDGE_H
            )
            if weight > best[0]:
                best = (weight, night.recovery)
    return best
