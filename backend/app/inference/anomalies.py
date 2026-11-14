"""Anomaly detection: each day's metrics against the user's own recent normal.

For every UTC day, each metric is compared with its normal days among the WINDOW days before
it (not included):

    z = (value - median) / max(1.4826 * MAD, sd_floor)

Normal days are the days on which none of the metric's kinds fired, so a stress week inside the
window neither becomes the baseline nor widens its spread, and a long stress period stays
flagged. A lasting change becomes the new normal after about two weeks: once fewer than
MIN_BASELINE_DAYS normal days are left, the metric is not judged, and those days count as
normal again.

A rule fires when the metric moves the rule's way by at least ATTENTION_Z and by at least its
`min_change` (so a very steady user is not flagged for a trivial change). Rules of the same
kind (e.g. stress: HRV down, heart rate up) make one anomaly per day and kind; the most
deviating metric is its `metric` / `value` / `baseline`, and `explanation` lists them all.

An anomaly is "attention", or "critical" when any of these holds (listed in
explanation["escalation"]):

- extreme: a metric is at least CRITICAL_Z out and twice its min_change.
- sustained: the same kind fired on SUSTAINED_DAYS days in a row, ending this day.
- multiple_signals: MULTI_SIGNAL_KINDS or more kinds fired on this day.

Metrics need MIN_BASELINE_DAYS normal days with data in the window before they are judged. Heart and
activity rules skip today, whose data is still coming in (a half day always has few steps);
sleep (last night) and mood can be judged as soon as they exist.

Mood is a single 1-5 tap a day, too coarse for a median and MAD (a steady user's MAD is 0, so
one 2-point dip would be extreme; a user who wobbles by a point would never be flagged). So
low_mood has its own rule (`_low_mood`), judged on days with a check-in against the usual mood:
the mean and standard deviation of the normal check-ins in the WINDOW days before the recent
ones (so the first low days of a dip don't drag the usual down before it fires). It fires on

- a dip: today's check-in and the recent mood (mean of the last MOOD_RECENT_CHECKINS
  check-ins within MOOD_RECENT_DAYS days, at least 2) are both MOOD_MIN_CHANGE below usual,
  and the recent mood is MOOD_Z spreads below it, so one bad tap among good ones is not a dip;
- a sharp drop: today's check-in alone is twice MOOD_MIN_CHANGE and MOOD_SHARP_Z spreads
  below usual;
- a very low mood: the last MOOD_RECENT_CHECKINS check-ins average MOOD_VERY_LOW or less.
  This needs no baseline and never becomes the new normal, so a new user or a slow decline
  is still caught. It is always critical ("very_low"); a recent mood twice MOOD_MIN_CHANGE
  below usual is critical too ("extreme").

`find` is pure (daily metric rows in, anomaly rows out); `detect` reads the metrics, stores
the anomalies for the range and returns them. Re-running `detect` updates the stored rows in
place, so an anomaly keeps its id while it still fires.

Run: python -m app.inference.anomalies --user <uuid> --days 21
"""

from __future__ import annotations

import argparse
import statistics
import uuid
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.db import repository as repo
from app.db.models import Anomaly

WINDOW = 14  # days before the judged day that form its baseline
MIN_BASELINE_DAYS = 7  # days with data the window needs before a metric is judged
ATTENTION_Z = 2.5
CRITICAL_Z = 4.0
SUSTAINED_DAYS = 3
MULTI_SIGNAL_KINDS = 3
MAD_TO_SD = 1.4826  # scales the median absolute deviation to a standard deviation
LEAD_DAYS = 2 * WINDOW  # days of history `detect` reads before the range to settle the baseline


@dataclass(frozen=True)
class Rule:
    metric: str
    kind: str
    direction: int  # +1: higher than usual is the anomaly, -1: lower
    min_change: float  # smallest change that counts, in the metric's unit
    sd_floor: float  # smallest spread assumed, so a very steady baseline doesn't flag noise
    relative: bool = False  # min_change is a fraction of the baseline instead
    full_day: bool = False  # needs the whole day's data, so today is skipped


RULES = (
    Rule("hrv_rmssd_avg", "stress", -1, 0.25, 3.0, relative=True, full_day=True),
    Rule("hr_avg", "stress", +1, 6.0, 1.5, full_day=True),
    Rule("sleep_duration_min", "short_sleep", -1, 90.0, 20.0),
    Rule("sleep_duration_min", "long_sleep", +1, 90.0, 20.0),
    Rule("bedtime_hour", "sleep_shift", +1, 1.5, 0.25),
    Rule("wake_hour", "sleep_shift", +1, 1.5, 0.25),
    Rule("steps", "low_activity", -1, 0.4, 800.0, relative=True, full_day=True),
    Rule("screen_time_min", "screen_time", +1, 0.4, 15.0, relative=True, full_day=True),
)

# Mood (see the module docstring and _low_mood)
MOOD_METRIC = "mood_avg"
MOOD_RECENT_CHECKINS = 3  # check-ins averaged into the recent mood ...
MOOD_RECENT_DAYS = 4  # ... from the last this many days, today included
MOOD_MIN_CHANGE = 1.0  # points below usual that count as low
MOOD_SD_FLOOR = 0.5  # smallest spread assumed, in points
MOOD_Z = 1.5  # a dip: recent mood this many spreads below usual
MOOD_SHARP_Z = 3.0  # a sharp drop: today's check-in alone this many spreads below usual
MOOD_VERY_LOW = 1.5  # recent mood at or below this is always low_mood, and critical

KINDS = (*dict.fromkeys(r.kind for r in RULES), "low_mood")


def find(
    daily: Sequence[Mapping[str, Any]], start: date, end: date, *, today: date
) -> list[dict[str, Any]]:
    """Anomalies on days [start, end] from `daily` (rows of repository.daily_metrics).

    Every day in `daily` is judged in order, since each day's anomalies decide which days are
    normal for the next ones; `daily` should start LEAD_DAYS before `start` so the first days
    have a settled baseline and a history. Days after `today` are not judged.
    Returns rows {day, kind, severity, metric, value, baseline, explanation}, by day and kind.
    """
    by_day = {r["day"]: r for r in daily}
    if not by_day:
        return []
    abnormal: dict[str, set[date]] = {rule.metric: set() for rule in RULES}
    abnormal[MOOD_METRIC] = set()
    fired: dict[date, dict[str, list[dict[str, Any]]]] = {}
    day = min(by_day)
    while day <= min(end, today):
        fired[day] = _signals(by_day, day, abnormal, today=today)
        for rule in RULES:
            if rule.kind in fired[day]:
                abnormal[rule.metric].add(day)
        if "low_mood" in fired[day]:
            abnormal[MOOD_METRIC].add(day)
        day += timedelta(days=1)

    out: list[dict[str, Any]] = []
    for day, kinds in fired.items():
        if day < start:
            continue
        for kind, signals in kinds.items():
            escalation = list(dict.fromkeys(e for s in signals for e in s["escalate"]))
            history = [day - timedelta(days=k) for k in range(1, SUSTAINED_DAYS)]
            if all(kind in fired.get(d, {}) for d in history):
                escalation.append("sustained")
            if len(kinds) >= MULTI_SIGNAL_KINDS:
                escalation.append("multiple_signals")
            top = max(signals, key=lambda s: abs(s["z"] or 0.0))  # z is None without a baseline
            out.append(
                {
                    "day": day,
                    "kind": kind,
                    "severity": "critical" if escalation else "attention",
                    "metric": top["metric"],
                    "value": top["value"],
                    "baseline": top["baseline"],
                    "explanation": {
                        "summary": "; ".join(_describe(s) for s in signals),
                        "signals": [
                            {k: v for k, v in s.items() if k != "escalate"} for s in signals
                        ],
                        "escalation": escalation,
                    },
                }
            )
    return out


def detect(
    session: Session, user_id: uuid.UUID, start: date, end: date, *, today: date | None = None
) -> list[Anomaly]:
    """Find the anomalies on days [start, end] and store them in place of the earlier ones."""
    today = today or datetime.now(UTC).date()
    daily = repo.daily_metrics(session, user_id, start - timedelta(days=LEAD_DAYS), end)
    return repo.replace_anomalies(
        session, user_id, start, end, find(daily, start, end, today=today)
    )


def _signals(
    by_day: Mapping[date, Mapping[str, Any]],
    day: date,
    abnormal: Mapping[str, set[date]],
    *,
    today: date,
) -> dict[str, list[dict[str, Any]]]:
    """Rules that fire on `day`, grouped by kind (in KINDS order). abnormal[metric] holds the
    earlier days on which one of the metric's kinds fired; they are left out of its baseline."""
    row = by_day.get(day)
    if row is None:
        return {}
    window = [day - timedelta(days=k) for k in range(1, WINDOW + 1)]
    kinds: dict[str, list[dict[str, Any]]] = {}
    for rule in RULES:
        value = row.get(rule.metric)
        if value is None or (rule.full_day and day >= today):
            continue
        value = float(value)  # some come back as Decimal
        history = [
            float(by_day[d][rule.metric])
            for d in window
            if d in by_day
            and by_day[d].get(rule.metric) is not None
            and d not in abnormal[rule.metric]
        ]
        if len(history) < MIN_BASELINE_DAYS:
            continue
        median = statistics.median(history)
        mad = statistics.median(abs(v - median) for v in history)
        scale = max(MAD_TO_SD * mad, rule.sd_floor)
        change = value - median
        min_change = rule.min_change * abs(median) if rule.relative else rule.min_change
        z = change / scale
        if rule.direction * z < ATTENTION_Z or rule.direction * change < min_change:
            continue
        extreme = rule.direction * z >= CRITICAL_Z and rule.direction * change >= 2 * min_change
        kinds.setdefault(rule.kind, []).append(
            {
                "metric": rule.metric,
                "value": value,
                "baseline": median,
                "change": change,
                "z": round(z, 2),
                "escalate": ["extreme"] if extreme else [],
            }
        )
    low = _low_mood(by_day, day, abnormal[MOOD_METRIC])
    if low:
        kinds["low_mood"] = [low]
    return {k: kinds[k] for k in KINDS if k in kinds}


def _low_mood(
    by_day: Mapping[date, Mapping[str, Any]], day: date, abnormal: set[date]
) -> dict[str, Any] | None:
    """The low_mood signal on `day`, or None (see the module docstring). abnormal holds the
    earlier days on which low_mood fired; they are left out of the usual mood."""

    def mood(d: date) -> float | None:
        value = by_day.get(d, {}).get(MOOD_METRIC)
        return None if value is None else float(value)

    score = mood(day)
    if score is None:
        return None
    recent_days = (day - timedelta(days=k) for k in range(MOOD_RECENT_DAYS))
    recent = [m for d in recent_days if (m := mood(d)) is not None][:MOOD_RECENT_CHECKINS]
    recent_mood = statistics.fmean(recent)
    window = (day - timedelta(days=MOOD_RECENT_DAYS - 1 + k) for k in range(1, WINDOW + 1))
    history = [m for d in window if d not in abnormal and (m := mood(d)) is not None]

    fires = False
    escalate: list[str] = []
    usual = z = None
    if len(history) >= MIN_BASELINE_DAYS:
        usual = statistics.fmean(history)
        scale = max(statistics.pstdev(history), MOOD_SD_FLOOR)
        drop, recent_drop = usual - score, usual - recent_mood
        dip = (
            len(recent) >= 2
            and drop >= MOOD_MIN_CHANGE
            and recent_drop >= MOOD_MIN_CHANGE
            and recent_drop / scale >= MOOD_Z
        )
        sharp = drop >= 2 * MOOD_MIN_CHANGE and drop / scale >= MOOD_SHARP_Z
        fires = dip or sharp
        if fires and recent_drop >= 2 * MOOD_MIN_CHANGE:
            escalate.append("extreme")
        z = round(-drop / scale, 2)
    if len(recent) == MOOD_RECENT_CHECKINS and recent_mood <= MOOD_VERY_LOW:
        fires = True
        escalate.append("very_low")
    if not fires:
        return None
    return {
        "metric": MOOD_METRIC,
        "value": score,
        "baseline": usual,
        "change": None if usual is None else score - usual,
        "z": z,
        "recent": round(recent_mood, 2),
        "recent_checkins": len(recent),
        "escalate": escalate,
    }


# --- Explanations ----------------------------------------------------------------------


def _clock(hours: float) -> str:
    minutes = round(60 * hours) % (24 * 60)
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def _duration(minutes: float) -> str:
    m = round(minutes)
    return f"{m // 60} h {m % 60:02d} min"


# metric -> (label, value format, change format)
_FORMATS: dict[str, tuple[str, Callable[[float], str], Callable[[float, float], str]]] = {
    "hrv_rmssd_avg": ("HRV", lambda v: f"{v:.0f} ms", lambda c, b: f"{100 * c / b:+.0f} %"),
    "hr_avg": ("heart rate", lambda v: f"{v:.0f} bpm", lambda c, b: f"{c:+.0f} bpm"),
    "sleep_duration_min": ("sleep", _duration, lambda c, b: f"{c / 60:+.1f} h"),
    "bedtime_hour": ("bedtime", _clock, lambda c, b: f"{c:+.1f} h"),
    "wake_hour": ("wake time", _clock, lambda c, b: f"{c:+.1f} h"),
    "steps": ("steps", lambda v: f"{v:,.0f}", lambda c, b: f"{100 * c / b:+.0f} %"),
    "active_minutes": ("active minutes", lambda v: f"{v:.0f} min", lambda c, b: f"{c:+.0f} min"),
    "screen_time_min": ("screen time", _duration, lambda c, b: f"{c / 60:+.1f} h"),
    "mood_avg": ("mood", lambda v: f"{v:.1f}/5", lambda c, b: f"{c:+.1f}"),
}


def _describe(signal: Mapping[str, Any]) -> str:
    """e.g. "HRV 31 ms vs usual 47 ms (-34 %)", or for mood
    "mood 2.0/5 vs usual 3.9/5 (-1.9), last 3 check-ins 2.3/5"."""
    label, value, change = _FORMATS[signal["metric"]]
    v, b, c = signal["value"], signal["baseline"], signal["change"]
    text = f"{label} {value(v)}" if b is None else f"{label} {value(v)} vs usual {value(b)}"
    if c is not None:
        text += f" ({change(c, b)})"
    if "recent" in signal:
        text += f", last {signal['recent_checkins']} check-ins {value(signal['recent'])}"
    return text


# --- CLI -------------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(description="Detect and store anomalies for one user.")
    p.add_argument("--user", type=uuid.UUID, required=True)
    p.add_argument("--days", type=int, default=14, help="number of days, ending on --end")
    p.add_argument("--end", type=date.fromisoformat, help="last UTC day (default: today)")
    args = p.parse_args(argv)

    from app.db import get_session

    end = args.end or datetime.now(UTC).date()
    start = end - timedelta(days=args.days - 1)
    with get_session() as s:
        found = detect(s, args.user, start, end)
        for a in found:
            print(f"{a.day}  {a.severity:<9}  {a.kind:<13}  {a.explanation['summary']}")
    print(f"user {args.user}: {len(found)} anomalies ({start} .. {end})")


if __name__ == "__main__":
    main()
