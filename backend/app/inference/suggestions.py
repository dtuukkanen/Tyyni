"""Suggestions: turn the day's anomalies into a few small practices, and learn which help.

Each anomaly kind has practices from CATALOG that fit it, best first (FOR_KIND): breathing
for stress, a screen-free wind-down for short sleep or a late bedtime, daylight for a late
wake-up (LATE_WAKE), a walk for low activity, and so on. The practices match the ones in
the app (box breathing, nearby nature, body scan, ...).

Suggestions for a day are made for the anomalies of that day and the day before (heart and
activity are judged once a day is over, so yesterday's anomalies are the newest ones), at
most MAX_PER_DAY a day:

- A kind that fired on both days counts once, as today's anomaly (the current state).
- Critical anomalies first. A very low mood ("very_low") gets talking to someone today, with
  the crisis line, ahead of everything else, every day while it lasts. Another critical low
  mood, or a critical anomaly with several signals at once ("multiple_signals"), gets
  reaching out to a friend first, under the cooldown below. A critical anomaly that is only
  sustained or extreme (a long stress week, a very late morning) gets no support practice:
  a nudge to message someone every day of it would be noise.
- Each anomaly gets one practice per round, so two anomalies get one each before either
  gets a second. An anomaly that already has a suggestion (e.g. made yesterday) gets none.
- A practice suggested in the COOLDOWN_DAYS days before is skipped while there are others,
  so the user isn't told the same thing every day.
- Within an anomaly kind, practices are ranked by FOR_KIND order plus what the user said
  about them before: the share of times a practice helped, smoothed towards one half
  (Laplace), where skipping counts as SKIP_WEIGHT of a "didn't help". Three "helped" lift
  a practice about three places; three "didn't help" drop it as far.

`choose` is pure (anomalies and suggestion history in, new suggestions out); `suggest` runs
anomaly detection for the two days, stores the new suggestions and returns the day's ones.
Making them again the same day only adds suggestions for new anomalies, so the list the user
already saw stays put.

Run: python -m app.inference.suggestions --user <uuid> [--day 2026-11-14]
"""

from __future__ import annotations

import argparse
import uuid
from collections.abc import Mapping, Sequence
from dataclasses import asdict, dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.db import repository as repo
from app.inference import anomalies

MAX_PER_DAY = 3
COOLDOWN_DAYS = 2  # a practice suggested this many days before is skipped while others fit
HISTORY_DAYS = 90  # how far back feedback counts
POSITION_STEP = 0.1  # score lost per place down the FOR_KIND list
SKIP_WEIGHT = 0.5  # a suggestion marked not done counts as this much of a "didn't help"


@dataclass(frozen=True)
class Practice:
    title: str
    text: str
    minutes: int
    category: str  # e.g. breathing, movement, sleep, screen, social, support


CATALOG: dict[str, Practice] = {
    "box_breathing": Practice(
        "Box breathing",
        "Breathe in for 4, hold for 4, out for 4, hold for 4. Four rounds slow a racing heart.",
        4,
        "breathing",
    ),
    "physiological_sigh": Practice(
        "Double inhale sigh",
        "Two short breaths in through the nose, then one long breath out through the mouth. "
        "Three times is enough.",
        1,
        "breathing",
    ),
    "body_scan": Practice(
        "Gentle body scan",
        "Lie down and move your attention slowly from your toes to your head, letting each "
        "part soften.",
        10,
        "rest",
    ),
    "slow_walk": Practice(
        "Mindful slow walk",
        "Walk slowly outside for ten minutes, noticing each step and what you hear.",
        10,
        "movement",
    ),
    "nature_walk": Practice(
        "Walk in nearby nature",
        "Twenty minutes among trees or by water lifts the mood and gets your steps up.",
        20,
        "movement",
    ),
    "mat_stretch": Practice(
        "Gentle stretch",
        "Roll out a mat and stretch your neck, back and hips slowly, without pushing.",
        8,
        "movement",
    ),
    "sound_sanctuary": Practice(
        "Sound sanctuary",
        "Put on calm sounds, close your eyes and let the sounds pass without labeling them.",
        5,
        "grounding",
    ),
    "sensory_grounding": Practice(
        "5-4-3-2-1 grounding",
        "Name five things you see, four you can touch, three you hear, two you smell and one "
        "you taste.",
        3,
        "grounding",
    ),
    "wind_down": Practice(
        "Screen-free wind-down",
        "Put the phone away 30 minutes before bed, dim the lights and do something calm.",
        30,
        "sleep",
    ),
    "earlier_bedtime": Practice(
        "An earlier night",
        "Go to bed 30 minutes earlier tonight to make up for the short night.",
        30,
        "sleep",
    ),
    "power_nap": Practice(
        "Short rest",
        "A nap of at most 20 minutes before 15:00 takes the edge off a short night without "
        "spoiling tonight's sleep.",
        20,
        "rest",
    ),
    "morning_light": Practice(
        "Morning daylight",
        "Get outside within an hour of waking. Daylight sets your body clock.",
        10,
        "sleep",
    ),
    "regular_wake": Practice(
        "Same wake-up time",
        "Set an alarm for your usual wake-up time, on weekends too.",
        1,
        "sleep",
    ),
    "phone_free_hour": Practice(
        "Phone-free hour",
        "Leave the phone in another room for an hour and do something with your hands.",
        60,
        "screen",
    ),
    "journal": Practice(
        "Write it down",
        "Write a few lines in your journal about how today feels.",
        5,
        "reflection",
    ),
    "message_friend": Practice(
        "Reach out to a friend",
        "Send a message to someone you trust. You don't have to explain everything.",
        5,
        "social",
    ),
    "crisis_support": Practice(
        "Talk to someone today",
        "You don't have to carry this alone. Talk to someone you trust or a professional "
        "today. MIELI Crisis Helpline answers at 09 2525 0111, and if you are in danger, "
        "call 112.",
        10,
        "support",
    ),
}

FOR_KIND: dict[str, tuple[str, ...]] = {  # anomaly kind -> practices, best first
    "stress": ("box_breathing", "physiological_sigh", "slow_walk", "body_scan", "sound_sanctuary"),
    "short_sleep": ("wind_down", "earlier_bedtime", "power_nap", "body_scan"),
    "long_sleep": ("morning_light", "regular_wake", "slow_walk", "message_friend"),
    "sleep_shift": ("wind_down", "morning_light", "regular_wake", "phone_free_hour"),
    "low_activity": ("slow_walk", "nature_walk", "mat_stretch"),
    "screen_time": ("phone_free_hour", "nature_walk", "wind_down", "sensory_grounding"),
    "low_mood": (
        "nature_walk",
        "message_friend",
        "journal",
        "sensory_grounding",
        "sound_sanctuary",
    ),
}
LATE_WAKE = ("morning_light", "regular_wake", "slow_walk")  # sleep_shift led by wake_hour
SUPPORT = "message_friend"  # first for a critical low mood or several signals at once ...
CRISIS = "crisis_support"  # ... or this, for a very low mood


def choose(
    found: Sequence[Mapping[str, Any]],
    history: Sequence[Mapping[str, Any]],
    day: date,
    *,
    limit: int = MAX_PER_DAY,
) -> list[dict[str, Any]]:
    """New suggestions for `day` (see the module docstring).

    found: anomalies {id, day, kind, severity, metric, explanation} of `day` and the day
    before.
    history: earlier suggestions {day, kind, anomaly_id, done, helped} (repository.suggestions),
    those of `day` included. Returns rows {day, kind, anomaly_id, reason}, in the order shown.
    """
    today = [h for h in history if h["day"] == day]
    taken = {h["kind"] for h in today}
    covered = {h["anomaly_id"] for h in history if h["anomaly_id"] is not None}
    recent = {h["kind"] for h in history if day - timedelta(days=COOLDOWN_DAYS) <= h["day"] < day}
    room = limit - len(today)

    newest: dict[str, Mapping[str, Any]] = {}  # a kind that fired both days: today's counts
    for a in sorted(found, key=lambda a: a["day"]):
        newest[a["kind"]] = a
    order = sorted(
        newest.values(),
        key=lambda a: (
            a["severity"] != "critical",
            -a["day"].toordinal(),
            anomalies.KINDS.index(a["kind"]),
        ),
    )
    queues: list[tuple[Mapping[str, Any], list[str]]] = []
    for a in order:
        queue = []
        support = _support(a, recent)
        if support:
            queue.append(support)
        if a["id"] not in covered:
            ranked = _rank(LATE_WAKE if _late_wake(a) else FOR_KIND[a["kind"]], history)
            queue += [k for k in ranked if k not in recent] + [k for k in ranked if k in recent]
        queues.append((a, queue))

    out: list[dict[str, Any]] = []
    while room > 0 and any(q for _, q in queues):
        for a, queue in queues:
            while queue and queue[0] in taken:
                queue.pop(0)
            if not queue or room == 0:
                continue
            kind = queue.pop(0)
            taken.add(kind)
            room -= 1
            out.append(
                {
                    "day": day,
                    "kind": kind,
                    "anomaly_id": a["id"],
                    "reason": (a.get("explanation") or {}).get("summary"),
                }
            )
    return out


def suggest(
    session: Session, user_id: uuid.UUID, day: date, *, today: date | None = None
) -> list[dict[str, Any]]:
    """Detect the anomalies of `day` and the day before, add suggestions for them and return
    all of the day's suggestions (as `present` rows)."""
    found = anomalies.detect(session, user_id, day - timedelta(days=1), day, today=today)
    history = repo.suggestions(session, user_id, day - timedelta(days=HISTORY_DAYS), day)
    rows = choose([_anomaly_row(a) for a in found], history, day)
    repo.add_suggestions(session, user_id, rows)
    return [present(s) for s in repo.suggestions(session, user_id, day, day)]


def present(row: Mapping[str, Any]) -> dict[str, Any]:
    """A stored suggestion row with its practice's title, text, minutes and category."""
    return {**row, **asdict(CATALOG[row["kind"]])}


# --- Ranking ---------------------------------------------------------------------------


def preference(kind: str, history: Sequence[Mapping[str, Any]]) -> float:
    """How much the user's feedback favours a practice, from -0.5 to +0.5 (0 without any)."""
    helped = unhelpful = 0.0
    for h in history:
        if h["kind"] != kind or h["done"] is None:
            continue
        if not h["done"]:
            unhelpful += SKIP_WEIGHT
        elif h["helped"] is True:
            helped += 1
        elif h["helped"] is False:
            unhelpful += 1
    return (helped + 1) / (helped + unhelpful + 2) - 0.5


def _rank(kinds: Sequence[str], history: Sequence[Mapping[str, Any]]) -> list[str]:
    score = {k: preference(k, history) - POSITION_STEP * i for i, k in enumerate(kinds)}
    return sorted(kinds, key=lambda k: -score[k])  # stable: ties keep FOR_KIND order


def _support(a: Mapping[str, Any], recent: set[str]) -> str | None:
    """The support practice an anomaly gets first, if any."""
    if a["severity"] != "critical":
        return None
    escalation = (a.get("explanation") or {}).get("escalation", [])
    if a["kind"] == "low_mood" and "very_low" in escalation:
        return CRISIS
    if (a["kind"] == "low_mood" or "multiple_signals" in escalation) and SUPPORT not in recent:
        return SUPPORT
    return None


def _late_wake(a: Mapping[str, Any]) -> bool:
    return a["kind"] == "sleep_shift" and a.get("metric") == "wake_hour"


def _anomaly_row(a: Any) -> dict[str, Any]:
    return {
        "id": a.id,
        "day": a.day,
        "kind": a.kind,
        "severity": a.severity,
        "metric": a.metric,
        "explanation": a.explanation,
    }


# --- CLI -------------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(description="Detect anomalies and make suggestions for a day.")
    p.add_argument("--user", type=uuid.UUID, required=True)
    p.add_argument("--day", type=date.fromisoformat, help="UTC day (default: today)")
    args = p.parse_args(argv)

    from app.db import get_session

    day = args.day or datetime.now(UTC).date()
    with get_session() as s:
        made = suggest(s, args.user, day)
    for m in made:
        why = f"  ({m['reason']})" if m["reason"] else ""
        print(f"{m['day']}  {m['kind']:<18}  {m['title']}{why}")
    print(f"user {args.user}: {len(made)} suggestions for {day}")


if __name__ == "__main__":
    main()
