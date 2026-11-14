"""Feeling journal simulator.

Produces `journal_entries` rows: short free-text entries in Finnish and English about how the
day felt, each with the ground truth a classifier (Jev / Nemotron, later) is evaluated against:

- expected_label: positive | neutral | harmful (harmful = any distressing feeling)
- expected_risk:  none | self_harm | suicidal (crisis content; only on harmful entries)

The truth is what was drawn, not re-derived from the text. Each day the user writes with some
probability (0-2 entries, the last one in the evening before bed). Each entry draws a tone from
the scenario's day mix and, if harmful, possibly crisis content. Texts are composed from phrase
banks: an event, a feeling, sometimes a closer. Risk sentences are short, first-person and
non-graphic. A few entries are distractors a keyword matcher gets wrong: negations ("en ole
enää ajatellut itsemurhaa"), third-person / news ("documentary about suicide prevention") and
hyperbole ("this exam is killing me"); they are positive or neutral with risk none.

language="mixed" writes ~60 % Finnish entries, and some entries switch language for a sentence.
artifacts adds writing noise (lowercase, no punctuation, typos, no ä/ö, one-sentence entries);
the rows, timestamps and truth stay the same.

Entries are timed within the waking day from the built-in `sleep_window`, or from real sleep
sessions passed as `nights` (e.g. `sleep.nights(...)`). Scenario timelines come from `timelines`
like the other simulators (stress_period, withdrawal, sudden_drop), so the data lines up across
inputs.

All randomness comes from one seeded RNG with a fixed number of draws per day, so two
scenarios generated with the same seed share the same draws and differ only by their shape.

Times are UTC.

Run: python -m app.simulators.journal --new-user demo --scenario crisis --days 21
"""

from __future__ import annotations

import math
import random
import re
import uuid
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import date, timedelta
from types import MappingProxyType
from typing import Any

from sqlalchemy.orm import Session

from app.db import repository as repo
from app.simulators import common, timelines
from app.simulators.common import clamp
from app.simulators.sleep_window import sleep_schedule, waking_window

SCENARIOS = (
    "stable_positive",
    "stable_neutral",
    "stable_low",
    "stress_period",
    "withdrawal",
    "sudden_drop",
    "crisis",
    "isolated_risk",
)
LANGUAGE_MODES = ("fi", "en", "mixed")
SOURCE_PREFIX = "simulator:journal"

WRITE_PROB = 0.7  # chance the user writes on a given day
SECOND_ENTRY_PROB = 0.25  # chance of a second entry earlier in the day
FI_SHARE = 0.6  # share of Finnish entries for language="mixed"
CODE_SWITCH_PROB = 0.1  # mixed: chance an entry has one sentence in the other language
DISTRACTOR_PROB = 0.08  # chance a positive / neutral entry is a distractor

# (positive share, harmful share) of the stable writers; the rest is neutral
MIXES = {"positive": (0.6, 0.05), "neutral": (0.3, 0.15), "low": (0.12, 0.5)}

HARMFUL_TOPICS = ("stress", "anxiety", "sad", "lonely", "sleep", "hopeless")
EVEN_TOPICS = MappingProxyType(dict.fromkeys(HARMFUL_TOPICS, 1.0))


@dataclass(frozen=True)
class Day:
    """One day's journal mix for a scenario."""

    positive: float  # share of positive entries
    harmful: float  # share of harmful entries (the rest is neutral)
    risk: float = 0.0  # chance a harmful entry has crisis content
    suicidal: float = 0.0  # share of crisis entries that are suicidal (the rest: self-harm)
    write: float = WRITE_PROB  # chance of writing today
    brief: float = 0.0  # 0..1: how much shorter entries get (withdrawal)
    topics: Mapping[str, float] = EVEN_TOPICS  # weights of the harmful topics
    force_risk: bool = False  # the day's last entry is a crisis entry


# --- Phrase banks ----------------------------------------------------------------------
# Sentences may contain {place} / {friend}, filled from FILLS. Every risk sentence is
# first-person and non-graphic: no methods or means.

PHRASES: dict[str, dict[str, list[str]]] = {
    "fi": {
        "positive_event": [
            "Kävin kävelyllä {place}.",
            "Kävin salilla töiden jälkeen.",
            "Näin {friend} pitkästä aikaa.",
            "Saunottiin illalla.",
            "Nukuin pitkästä aikaa hyvin.",
            "Sain vihdoin projektin valmiiksi.",
            "Kävin uimassa aamulla.",
            "Laitoin hyvää ruokaa ja katsoin leffan.",
        ],
        "positive_feeling": [
            "Oli tosi hyvä päivä.",
            "Hyvä päivä kaikin puolin.",
            "Olo on kevyt ja rauhallinen.",
            "Olen kiitollinen tästä päivästä.",
            "Pitkästä aikaa iloinen olo.",
            "Tuntuu, että asiat menee eteenpäin.",
        ],
        "positive_closer": ["Huomenna uusi päivä.", "Tästä on hyvä jatkaa.", ":)"],
        "neutral_event": [
            "Töissä oli tavallinen päivä.",
            "Luennot venyi iltapäivään.",
            "Kävin kaupassa ja siivosin vähän.",
            "Satoi koko päivän.",
            "Pyykkiä ja tiskejä.",
            "Palaveri kesti kaksi tuntia.",
            "Tein koulujuttuja illalla.",
        ],
        "neutral_feeling": [
            "Ihan ok päivä.",
            "Ei mitään erikoista.",
            "Vähän väsyttää, mutta muuten ok.",
            "Perus päivä.",
            "Olo on aika neutraali.",
        ],
        "neutral_closer": ["Nukkumaan.", "Katsotaan huomenna."],
        "stress": [
            "Deadline on huomenna enkä ole läheskään valmis.",
            "Töissä kaatui kaikki päälle.",
            "Tenttiviikko painaa päälle.",
            "Olen ihan loppu.",
            "Stressi painaa rinnassa.",
            "En jaksa tätä kiirettä enää.",
        ],
        "anxiety": [
            "Sydän hakkasi koko illan.",
            "Ahdistaa, enkä tiedä miksi.",
            "Pelkään, että mokaan huomenna.",
            "En saanut ajatuksia rauhoittumaan.",
        ],
        "sad": [
            "Itkin illalla.",
            "Olo on tosi surullinen.",
            "Kaikki tuntuu raskaalta.",
            "Huono päivä taas.",
        ],
        "lonely": [
            "En ole puhunut kenellekään moneen päivään.",
            "Jäin taas kotiin yksin.",
            "Tuntuu, ettei kukaan välitä.",
            "Perruin taas menot kavereiden kanssa.",
        ],
        "sleep": [
            "Nukuin taas vain pari tuntia.",
            "Valvoin pitkälle yöhön.",
            "Heräsin neljältä enkä saanut enää unta.",
        ],
        "hopeless": [
            "Mikään ei tunnu miltään.",
            "Mitä järkeä tässä kaikessa on.",
            "En näe mitään hyvää edessäpäin.",
            "En jaksa enää.",
        ],
        "self_harm": [
            "Viiltelin taas.",
            "Viiltely houkuttaa taas.",
            "Tekisi mieli satuttaa itseäni.",
            "Satutin itseäni taas illalla.",
            "En pystynyt olemaan viiltelemättä.",
        ],
        "suicidal": [
            "Ajattelin taas itsemurhaa.",
            "Itsemurha käy mielessä yhä useammin.",
            "En halua enää elää.",
            "En halua olla enää olemassa.",
            "Olisi helpompaa, jos en heräisi aamulla.",
        ],
        "distractor_neutral": [
            "Katsoin dokumentin itsemurhien ehkäisystä.",
            "Tunnilla luettiin artikkeli nuorten viiltelystä.",
            "Kuolen tylsyyteen näissä palavereissa.",
            "Tämä tentti tappaa minut, haha.",
            "Ei mitään itsetuhoista, väsyttää vain.",
        ],
        "distractor_positive": [
            "En ole enää ajatellut itsemurhaa, menee paremmin.",
            "Puoli vuotta ilman viiltelyä, olen ylpeä itsestäni.",
        ],
    },
    "en": {
        "positive_event": [
            "Went for a walk {place}.",
            "Hit the gym after work.",
            "Met {friend} for coffee.",
            "Sauna in the evening.",
            "Slept really well for once.",
            "Finally finished the project.",
            "Went swimming in the morning.",
            "Cooked a nice dinner and watched a movie.",
        ],
        "positive_feeling": [
            "Good day overall.",
            "Really good day.",
            "Feeling calm and light.",
            "Grateful for today.",
            "Happy for the first time in a while.",
            "Things are moving forward.",
        ],
        "positive_closer": ["Tomorrow's a new day.", "Good to keep going like this.", ":)"],
        "neutral_event": [
            "Normal day at work.",
            "Lectures dragged on into the afternoon.",
            "Did groceries and cleaned a bit.",
            "Rained all day.",
            "Laundry and dishes.",
            "Two-hour meeting.",
            "Did homework in the evening.",
        ],
        "neutral_feeling": [
            "Pretty ok day.",
            "Nothing special.",
            "A bit tired but otherwise fine.",
            "Just a regular day.",
            "Feeling pretty neutral.",
        ],
        "neutral_closer": ["Off to bed.", "We'll see tomorrow."],
        "stress": [
            "Deadline tomorrow and I'm nowhere near done.",
            "Everything piled up at work.",
            "Exam week is too much.",
            "I'm completely exhausted.",
            "The stress sits on my chest.",
            "Can't keep up with all of this.",
        ],
        "anxiety": [
            "My heart was racing all evening.",
            "Anxious and I don't know why.",
            "Scared I'll mess up tomorrow.",
            "Couldn't calm my thoughts down.",
        ],
        "sad": [
            "Cried in the evening.",
            "Feeling really sad.",
            "Everything feels heavy.",
            "Bad day again.",
        ],
        "lonely": [
            "Haven't talked to anyone in days.",
            "Stayed home alone again.",
            "Feels like nobody cares.",
            "Cancelled plans with friends again.",
        ],
        "sleep": [
            "Only slept a couple of hours again.",
            "Stayed up way too late.",
            "Woke up at four and couldn't fall back asleep.",
        ],
        "hopeless": [
            "Nothing feels like anything.",
            "What's the point of any of this.",
            "I can't see anything good ahead.",
            "I can't do this anymore.",
        ],
        "self_harm": [
            "I cut myself again.",
            "The urge to self-harm is back.",
            "I want to hurt myself.",
            "Hurt myself again tonight.",
            "Couldn't stop myself from cutting.",
        ],
        "suicidal": [
            "I keep thinking about suicide.",
            "Suicide is on my mind more and more.",
            "I don't want to live anymore.",
            "I don't want to be here anymore.",
            "It would be easier if I didn't wake up.",
        ],
        "distractor_neutral": [
            "Watched a documentary about suicide prevention.",
            "We read an article about self-harm in class.",
            "This meeting is killing me.",
            "This exam is going to kill me lol.",
            "Not suicidal or anything, just tired.",
        ],
        "distractor_positive": [
            "Haven't had suicidal thoughts in a while, things are better.",
            "Six months without self-harm, proud of myself.",
        ],
    },
}

FILLS = {
    "fi": {
        "place": ["metsässä", "rannassa", "keskustassa", "koiran kanssa", "töiden jälkeen"],
        "friend": ["Annan", "Mikon", "vanhoja kavereita", "siskoni"],
    },
    "en": {
        "place": ["in the park", "by the sea", "downtown", "with the dog", "after work"],
        "friend": ["Anna", "Mikko", "an old friend", "my sister"],
    },
}


# --- Generation ------------------------------------------------------------------------


def generate(
    user_id: uuid.UUID,
    start: date,
    days: int,
    scenario: str = "stable_neutral",
    *,
    language: str = "mixed",
    artifacts: bool = False,
    seed: int | None = None,
    nights: Sequence[Mapping[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """Journal entries for `days` UTC days from `start`, shaped for insert_journal_entries.

    language: "fi", "en" or "mixed". artifacts adds writing noise to the texts; everything
    else is unchanged. nights: sleep sessions ({bedtime, wake_time}, e.g. from `sleep.nights`)
    that set the waking day instead of the built-in sleep window.
    """
    common.check_args(scenario, SCENARIOS, days)
    if language not in LANGUAGE_MODES:
        raise ValueError(f"unknown language {language!r}; choose from {LANGUAGE_MODES}")

    rng, artifact_rng = common.rngs(seed)
    origin = common.midnight(start)
    schedule = sleep_schedule(days, origin, nights)
    source = f"{SOURCE_PREFIX}:{scenario}"

    rows: list[dict[str, Any]] = []
    for d in range(days):
        day = _day(scenario, d, days)
        write_u, second_u, early_u, late_u = (rng.random() for _ in range(4))
        slots = [[rng.random() for _ in range(7)] for _ in range(2)]  # fixed draws per entry

        n = 0 if write_u >= day.write else 1 + (second_u < SECOND_ENTRY_PROB)
        if day.force_risk:
            n = max(n, 1)
        if not n:
            continue

        wake, bed = waking_window(schedule, d)
        late = max(bed - 0.3 - 2.2 * late_u, wake + 0.5)
        hours = [late] if n == 1 else [min(wake + 2 + (bed - wake - 5) * early_u, late - 0.5), late]

        for i, hour in enumerate(hours):
            tone_u, risk_u, suicidal_u, distractor_u, lang_u, switch_u, text_u = slots[i]
            forced = day.force_risk and i == n - 1
            label = _label(day, tone_u) if not forced else "harmful"
            risk = "none"
            if label == "harmful" and (forced or risk_u < day.risk):
                risk = "suicidal" if suicidal_u < day.suicidal else "self_harm"
            lang = language if language != "mixed" else ("fi" if lang_u < FI_SHARE else "en")
            switch = language == "mixed" and switch_u < CODE_SWITCH_PROB
            distractor = label != "harmful" and distractor_u < DISTRACTOR_PROB

            text_rng = random.Random(text_u)
            sentences, key = _compose(text_rng, lang, label, risk, day, distractor=distractor)
            if switch:
                other = "en" if lang == "fi" else "fi"
                sentences.append(_switch_sentence(text_rng, other, label, risk))
            text = (
                _with_artifacts(artifact_rng, sentences, key, lang)
                if artifacts
                else " ".join(sentences)
            )
            rows.append(
                {
                    "user_id": user_id,
                    "ts": origin + timedelta(days=d, minutes=round(60 * hour)),
                    "text": text,
                    "language": lang,
                    "expected_label": label,
                    "expected_risk": risk,
                    "source": source,
                }
            )
    return rows


def simulate(
    session: Session,
    user_id: uuid.UUID,
    start: date,
    days: int,
    scenario: str = "stable_neutral",
    *,
    replace: bool = True,
    **kwargs: Any,
) -> int:
    """Generate and write journal entries. replace=True first clears earlier simulator entries."""
    rows = generate(user_id, start, days, scenario, **kwargs)
    return common.write(
        session, user_id, SOURCE_PREFIX, rows, repo.insert_journal_entries, replace=replace
    )


def _label(day: Day, u: float) -> str:
    if u < day.harmful:
        return "harmful"
    if u < day.harmful + day.positive:
        return "positive"
    return "neutral"


# --- Text ------------------------------------------------------------------------------


def _pick(rng: random.Random, lang: str, bank: str) -> str:
    sentence = rng.choice(PHRASES[lang][bank])
    fills = {k: rng.choice(v) for k, v in FILLS[lang].items()}
    return sentence.format(**fills)


def _compose(
    rng: random.Random, lang: str, label: str, risk: str, day: Day, *, distractor: bool
) -> tuple[list[str], int]:
    """(sentences, index of the key sentence that carries the label)."""
    keep = 1 - 0.7 * day.brief  # chance of each optional sentence
    if label in ("positive", "neutral"):
        event = _pick(rng, lang, f"{label}_event")
        key_sentence = (
            _pick(rng, lang, f"distractor_{label}")
            if distractor
            else _pick(rng, lang, f"{label}_feeling")
        )
        sentences = [event] if rng.random() < 0.85 * keep else []
        sentences.append(key_sentence)
        key = len(sentences) - 1
        if rng.random() < 0.4 * keep:
            sentences.append(_pick(rng, lang, f"{label}_closer"))
        return sentences, key

    topic = _weighted(rng, day.topics)
    sentences = [_pick(rng, lang, topic)]
    if rng.random() < 0.6 * keep:
        second = _pick(rng, lang, _weighted(rng, day.topics))
        if second not in sentences:
            sentences.append(second)
    if risk == "none":
        return sentences, 0
    sentences.append(_pick(rng, lang, risk))
    key = len(sentences) - 1
    if rng.random() < 0.3 * keep:
        closer = _pick(rng, lang, "hopeless")
        if closer not in sentences:
            sentences.append(closer)
    return sentences, key


def _switch_sentence(rng: random.Random, lang: str, label: str, risk: str) -> str:
    """A sentence in the other language that keeps the entry's tone."""
    if label == "harmful":
        return _pick(rng, lang, "sad" if risk == "none" else "hopeless")
    return _pick(rng, lang, f"{label}_feeling")


def _weighted(rng: random.Random, weights: Mapping[str, float]) -> str:
    return rng.choices(list(weights), weights=list(weights.values()))[0]


_PUNCTUATION = re.compile(r"[.,!?']")
_NO_DIACRITICS = str.maketrans("äöåÄÖÅ", "aoaAOA")


def _with_artifacts(rng: random.Random, sentences: list[str], key: int, lang: str) -> str:
    """Phone-typing noise. Fixed draws per entry; the key sentence (and the truth) survives."""
    short_u, diacritics_u, lower_u, punct_u, typo_u, word_u, pos_u = (
        rng.random() for _ in range(7)
    )
    text = sentences[key] if short_u < 0.15 else " ".join(sentences)
    if lang == "fi" and diacritics_u < 0.3:
        text = text.translate(_NO_DIACRITICS)
    if lower_u < 0.4:
        text = text.lower()
    if punct_u < 0.3:
        text = _PUNCTUATION.sub("", text)
    if typo_u < 0.3:
        words = text.split(" ")
        long = [i for i, w in enumerate(words) if len(w) >= 5 and w.isalpha()]
        if long:
            i = long[math.floor(word_u * len(long))]
            w = words[i]
            j = 1 + math.floor(pos_u * (len(w) - 3))  # swap two inner letters
            words[i] = w[:j] + w[j + 1] + w[j] + w[j + 2 :]
            text = " ".join(words)
    return text


# --- Scenarios -------------------------------------------------------------------------


def _mix(name: str, **kwargs: Any) -> Day:
    positive, harmful = MIXES[name]
    return Day(positive=positive, harmful=harmful, **kwargs)


def _toward(target: tuple[float, float], t: float, **kwargs: Any) -> Day:
    """The neutral writer moved a fraction t of the way to (positive, harmful)."""
    positive, harmful = MIXES["neutral"]
    return Day(
        positive=positive + (target[0] - positive) * t,
        harmful=harmful + (target[1] - harmful) * t,
        **kwargs,
    )


def _day(scenario: str, d: int, days: int) -> Day:
    """Scenario mix for day index d."""
    if scenario.startswith("stable_"):
        return _mix(scenario.removeprefix("stable_"))
    if scenario == "stress_period":
        topics = {**EVEN_TOPICS, "stress": 4.0, "sleep": 2.0, "anxiety": 2.0, "hopeless": 0.3}
        return _toward((0.08, 0.7), timelines.stress_intensity(d, days), topics=topics)
    if scenario == "withdrawal":
        r = timelines.decline(d, days)
        topics = {**EVEN_TOPICS, "lonely": 4.0, "sad": 2.0, "stress": 0.5}
        return _toward((0.05, 0.65), r, write=WRITE_PROB * (1 - 0.6 * r), brief=r, topics=topics)
    if scenario == "sudden_drop":  # one very bad day on the drop day
        k = timelines.sudden_drop(d, days)
        topics = {**EVEN_TOPICS, "sad": 3.0, "anxiety": 3.0, "sleep": 2.0}
        return _toward((0.0, 0.95), k, write=WRITE_PROB + (1 - WRITE_PROB) * k, topics=topics)
    if scenario == "crisis":
        r = timelines.decline(d, days)
        risk_start = round(0.7 * days)
        q = clamp((d - risk_start + 1) / max(days - risk_start, 1)) if d >= risk_start else 0.0
        topics = {**EVEN_TOPICS, "hopeless": 1 + 4 * r, "lonely": 2.0, "sad": 2.0}
        return _toward(
            (0.02, 0.85),
            r,
            risk=0.6 * q,
            suicidal=clamp(2 * q - 1),  # self-harm first, suicidal later
            topics=topics,
            force_risk=d == days - 1,
        )
    # isolated_risk: a steady neutral writer with a single crisis entry in the middle
    if d == days // 2:
        return _mix("neutral", suicidal=0.5, force_risk=True)
    return _mix("neutral")


# --- CLI -------------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> None:
    parser = common.parser(
        "Simulate feeling journal entries.",
        SCENARIOS,
        "stable_neutral",
        artifacts_help="add phone-typing noise",
        replace_help="keep earlier journal simulator entries instead of clearing them",
    )
    parser.add_argument("--language", choices=LANGUAGE_MODES, default="mixed")
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
            language=args.language,
            artifacts=args.artifacts,
            seed=args.seed,
        )
    print(f"user {user_id}: wrote {n} journal entries ({args.scenario}, {start} .. {end})")


if __name__ == "__main__":
    main()
