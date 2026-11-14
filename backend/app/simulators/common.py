"""Building blocks shared by all simulators: math helpers, run setup, writing and the CLI."""

from __future__ import annotations

import argparse
import itertools
import math
import random
import uuid
from collections.abc import Callable, Mapping, Sequence
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.db import repository as repo

GAP_DAY_PROB = 0.5  # artifacts: chance a day has a 1-3 h gap (device off / not carried)


# --- Math ------------------------------------------------------------------------------


def clamp(value: float, bounds: tuple[float, float] = (0.0, 1.0)) -> float:
    return min(max(value, bounds[0]), bounds[1])


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def interp(x: float, knots: Sequence[tuple[float, float]]) -> float:
    """Piecewise-linear through knots; flat before the first and after the last."""
    if x <= knots[0][0]:
        return knots[0][1]
    for (x0, y0), (x1, y1) in itertools.pairwise(knots):
        if x <= x1:
            return y1 if x1 == x0 else lerp(y0, y1, (x - x0) / (x1 - x0))
    return knots[-1][1]


def sigmoid(x: float) -> float:
    if x < -40:
        return 0.0
    return 1 / (1 + math.exp(-x))


# --- Run setup -------------------------------------------------------------------------


def check_args(
    scenario: str, scenarios: Sequence[str], days: int, interval_min: int | None = None
) -> None:
    if scenario not in scenarios:
        raise ValueError(f"unknown scenario {scenario!r}; choose from {tuple(scenarios)}")
    if days < 1:
        raise ValueError("days must be >= 1")
    if interval_min is not None and (interval_min < 1 or 1440 % interval_min):
        raise ValueError("interval_min must divide a day (e.g. 1, 5, 10, 15, 30, 60)")


def rngs(seed: int | None) -> tuple[random.Random, random.Random]:
    """(main RNG, artifact RNG). Artifacts get their own stream so they never shift the noise,
    and the main RNG's draws don't depend on the scenario, so two scenarios generated with the
    same seed share the same noise and differ only by their shape."""
    rng = random.Random(seed)
    return rng, random.Random(rng.random())


def midnight(day: date) -> datetime:
    """Start of the UTC calendar day, the origin all simulated timestamps are offsets from."""
    return datetime(day.year, day.month, day.day, tzinfo=UTC)


def profile[T](scenario: str, profiles: Mapping[str, T], default: str = "average") -> T:
    """The person behind a scenario: profiles[x] for "stable_x", otherwise profiles[default]."""
    if scenario.startswith("stable_"):
        return profiles[scenario.removeprefix("stable_")]
    return profiles[default]


def draw_gap(rng: random.Random) -> tuple[float, float] | None:
    """(start hour, end hour) of a 1-3 h data gap on GAP_DAY_PROB of days, else None."""
    if rng.random() >= GAP_DAY_PROB:
        return None
    length = rng.uniform(1.0, 3.0)
    begin = rng.uniform(0.0, 24.0 - length)
    return begin, begin + length


# --- Writing ---------------------------------------------------------------------------


def write(
    session: Session,
    user_id: uuid.UUID,
    source_prefix: str,
    rows: list[dict[str, Any]],
    insert: Callable[[Session, list[dict[str, Any]]], Any],
    *,
    replace: bool = True,
    chunk_size: int = 2000,
) -> int:
    """Insert rows in chunks. replace=True first clears the user's earlier `source_prefix` data."""
    if replace:
        repo.delete_source_data(session, user_id, source_prefix)
    for i in range(0, len(rows), chunk_size):
        insert(session, rows[i : i + chunk_size])
    return len(rows)


# --- CLI -------------------------------------------------------------------------------


def parser(
    description: str,
    scenarios: Sequence[str],
    default_scenario: str,
    *,
    artifacts_help: str,
    replace_help: str,
) -> argparse.ArgumentParser:
    """Argument parser with the options every simulator takes; add your own before parsing."""
    p = argparse.ArgumentParser(description=description)
    who = p.add_mutually_exclusive_group(required=True)
    who.add_argument("--user", type=uuid.UUID, help="existing user id")
    who.add_argument("--new-user", metavar="NAME", help="create a user with this display name")
    p.add_argument("--scenario", choices=scenarios, default=default_scenario)
    p.add_argument("--days", type=int, default=21)
    p.add_argument(
        "--start",
        type=date.fromisoformat,
        help="first UTC day, YYYY-MM-DD (default: so the last day is today)",
    )
    p.add_argument("--artifacts", action="store_true", help=artifacts_help)
    p.add_argument("--seed", type=int)
    p.add_argument("--no-replace", action="store_true", help=replace_help)
    return p


def period(args: argparse.Namespace) -> tuple[date, date]:
    """(first, last) UTC day of the run; by default the last day is today."""
    start = args.start or datetime.now(UTC).date() - timedelta(days=args.days - 1)
    return start, start + timedelta(days=args.days - 1)


def user(session: Session, args: argparse.Namespace) -> uuid.UUID:
    """--user, or a user created from --new-user."""
    return args.user or repo.create_user(session, args.new_user)
