"""Every signal for one user in one run.

One scenario name picks each simulator's matching scenario (the same name where it has one,
otherwise its closest match, otherwise its steady default), one seed drives them all, and the
sleep simulator's nights set when the other signals sleep, so the whole story lines up.

Used by the API's simulate endpoint, and as a CLI that also detects the anomalies and makes
the last day's suggestions:

    python -m app.simulators.combined --new-user demo --scenario stress_period --days 21 --seed 1
"""

from __future__ import annotations

import random
import uuid
from collections.abc import Collection, Mapping
from dataclasses import dataclass
from datetime import date
from types import ModuleType

from sqlalchemy.orm import Session

from app.simulators import activity, common, hrv, journal, mood, screen, sleep

# signal name -> simulator, in the order they are written
MODULES: dict[str, ModuleType] = {
    "sleep": sleep,
    "heart": hrv,
    "activity": activity,
    "screen": screen,
    "mood": mood,
    "journal": journal,
}
SIGNALS = tuple(MODULES)

# what a signal tells when it has no version of the scenario
DEFAULTS = {signal: "stable_average" for signal in SIGNALS} | {"journal": "stable_neutral"}

# closest match for scenarios a signal names differently or lacks; heart, activity and screen
# also follow the sleep simulator's own pairings (sleep.HRV_SCENARIO, ...)
ALIASES: dict[str, Mapping[str, str]] = {
    "sleep": {"sudden_drop": "short_night", "stable_low": "stable_poor"},
    "heart": sleep.HRV_SCENARIO,
    "activity": sleep.ACTIVITY_SCENARIO,
    "screen": sleep.SCREEN_SCENARIO,
    "mood": {"stable_poor": "stable_low"},
    "journal": {"stable_good": "stable_positive", "stable_poor": "stable_low"},
}

# every scenario name any simulator knows
SCENARIOS = tuple(sorted({name for m in MODULES.values() for name in m.SCENARIOS}))


@dataclass(frozen=True)
class Run:
    seed: int
    scenarios: dict[str, str]  # signal -> the scenario it followed
    rows: dict[str, int]  # signal -> rows written


def scenarios_for(scenario: str, overrides: Mapping[str, str] | None = None) -> dict[str, str]:
    """The scenario each signal follows for `scenario`; overrides set one signal's directly.

    Raises ValueError for an unknown scenario, signal or override.
    """
    if scenario not in SCENARIOS:
        raise ValueError(f"unknown scenario {scenario!r}; one of: {', '.join(SCENARIOS)}")
    overrides = overrides or {}
    for signal, name in overrides.items():
        if signal not in MODULES:
            raise ValueError(f"unknown signal {signal!r}; one of: {', '.join(SIGNALS)}")
        if name not in MODULES[signal].SCENARIOS:
            choices = ", ".join(MODULES[signal].SCENARIOS)
            raise ValueError(f"{signal} has no scenario {name!r}; one of: {choices}")

    def pick(signal: str) -> str:
        if signal in overrides:
            return overrides[signal]
        if scenario in MODULES[signal].SCENARIOS:
            return scenario
        return ALIASES[signal].get(scenario, DEFAULTS[signal])

    return {signal: pick(signal) for signal in SIGNALS}


def simulate(
    session: Session,
    user_id: uuid.UUID,
    start: date,
    days: int,
    scenario: str = "stable_average",
    *,
    signals: Collection[str] = SIGNALS,
    overrides: Mapping[str, str] | None = None,
    seed: int | None = None,
    artifacts: bool = False,
    language: str = "mixed",
    replace: bool = True,
) -> Run:
    """Write `signals` for days [start, start + days - 1] with one seed (drawn when None).

    With sleep among the signals, the others follow its nights; without it they use the
    built-in night. replace clears only each signal's earlier simulator rows.
    """
    unknown = set(signals) - set(SIGNALS)
    if unknown:
        raise ValueError(f"unknown signals {sorted(unknown)}; one of: {', '.join(SIGNALS)}")
    chosen = scenarios_for(scenario, overrides)
    # the other signals must see the same nights as the sleep sessions, so always fix a seed
    seed = seed if seed is not None else random.randrange(2**32)
    nights = sleep.nights(start, days, chosen["sleep"], seed=seed) if "sleep" in signals else None

    rows = {}
    for signal, module in MODULES.items():
        if signal not in signals:
            continue
        kwargs = {"seed": seed, "artifacts": artifacts}
        if signal != "sleep":
            kwargs["nights"] = nights
        if signal == "journal":
            kwargs["language"] = language
        rows[signal] = module.simulate(
            session, user_id, start, days, chosen[signal], replace=replace, **kwargs
        )
    return Run(seed, {s: chosen[s] for s in rows}, rows)


def main(argv: list[str] | None = None) -> None:
    parser = common.parser(
        "Simulate every signal for one user, then detect anomalies and make suggestions.",
        SCENARIOS,
        "stable_average",
        artifacts_help="add each simulator's real-world mess (gaps, typos, ...)",
        replace_help="keep earlier simulator data instead of clearing it",
    )
    parser.add_argument(
        "--signals", nargs="+", choices=SIGNALS, default=list(SIGNALS), help="default: all"
    )
    parser.add_argument("--language", choices=journal.LANGUAGE_MODES, default="mixed")
    parser.add_argument(
        "--no-infer",
        action="store_true",
        help="skip anomaly detection and the last day's suggestions",
    )
    args = parser.parse_args(argv)

    from app.db import get_session
    from app.inference import anomalies, suggestions

    start, end = common.period(args)
    with get_session() as s:
        user_id = common.user(s, args)
        run = simulate(
            s,
            user_id,
            start,
            args.days,
            args.scenario,
            signals=args.signals,
            seed=args.seed,
            artifacts=args.artifacts,
            language=args.language,
            replace=not args.no_replace,
        )
        if not args.no_infer:
            found = anomalies.detect(s, user_id, start, end)
            made = suggestions.suggest(s, user_id, end)
    print(f"user {user_id}: {start} .. {end}, seed {run.seed}")
    for signal, n in run.rows.items():
        print(f"  {signal:<9} {n:>6} rows ({run.scenarios[signal]})")
    if not args.no_infer:
        print(f"  {len(found)} anomalies, {len(made)} suggestions for {end}")


if __name__ == "__main__":
    main()
