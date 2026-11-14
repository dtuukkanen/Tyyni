"""Journal simulator. Shape tests aggregate over several seeds and compare against
stable_neutral with the same seeds, which share the same draws, so they check the scenario
shape rather than luck of the draw."""

import statistics
import uuid
from collections import Counter
from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy import text

from app.db import get_session
from app.db import repository as repo
from app.db.models import LABELS, LANGUAGES, RISKS
from app.simulators import hrv, journal, sleep

UID = uuid.UUID(int=0)
START = date(2026, 10, 1)
ORIGIN = datetime(2026, 10, 1, tzinfo=UTC)
DAYS = 21
SEED = 7
SEEDS = range(12)


def gen(scenario="stable_neutral", **kw):
    kw.setdefault("seed", SEED)
    return journal.generate(UID, START, kw.pop("days", DAYS), scenario, **kw)


def day_of(r):
    return (r["ts"] - ORIGIN).days


def over_seeds(scenario, **kw):
    return [r for seed in SEEDS for r in gen(scenario, seed=seed, **kw)]


def share(rows, label, days=None):
    rows = [r for r in rows if days is None or day_of(r) in days]
    return sum(r["expected_label"] == label for r in rows) / len(rows)


def bank(name):
    return [p for lang in LANGUAGES for p in journal.PHRASES[lang][name]]


def test_deterministic():
    rows = gen(seed=1)
    assert rows == gen(seed=1)
    assert rows != gen(seed=2)
    assert {r["source"] for r in rows} == {"simulator:journal:stable_neutral"}


def test_rejects_bad_arguments():
    with pytest.raises(ValueError):
        gen("nope")
    with pytest.raises(ValueError):
        gen(language="sv")
    with pytest.raises(ValueError):
        gen(days=0)


@pytest.mark.parametrize("scenario", journal.SCENARIOS)
@pytest.mark.parametrize("seed", [1, 2, 3])
@pytest.mark.parametrize("artifacts", [False, True])
def test_entries_are_consistent(scenario, seed, artifacts):
    rows = gen(scenario, seed=seed, artifacts=artifacts)
    assert rows
    assert [r["ts"] for r in rows] == sorted(r["ts"] for r in rows)
    assert max(Counter(day_of(r) for r in rows).values()) <= 2
    for r in rows:
        assert 0 <= day_of(r) < DAYS
        assert r["text"].strip()
        assert r["language"] in LANGUAGES
        assert r["expected_label"] in LABELS
        assert r["expected_risk"] in RISKS
        if r["expected_risk"] != "none":
            assert r["expected_label"] == "harmful"


def test_language_modes():
    assert {r["language"] for r in over_seeds("stable_neutral", language="fi")} == {"fi"}
    english = over_seeds("crisis", language="en")
    assert {r["language"] for r in english} == {"en"}
    assert not any(c in r["text"] for r in english for c in "äöÄÖ")  # never switches to Finnish
    mixed = over_seeds("stable_neutral")
    fi_share = sum(r["language"] == "fi" for r in mixed) / len(mixed)
    assert fi_share == pytest.approx(journal.FI_SHARE, abs=0.1)


def test_covers_finnish_and_english_crisis_and_everyday_words():
    rows = over_seeds("crisis") + over_seeds("stable_positive")
    texts = " ".join(r["text"].lower() for r in rows)
    for word in ("itsemurha", "viiltel", "hyvä päivä", "kävin kävelyllä", "went for a walk"):
        assert word in texts, word
    for word in ("suicide", "self-harm", "cut myself"):
        assert word in texts, word


def test_crisis_sentences_only_in_risk_entries():
    rows = over_seeds("crisis") + over_seeds("isolated_risk")
    for risk in ("self_harm", "suicidal"):
        sentences = bank(risk)
        for r in rows:
            has = any(p in r["text"] for p in sentences)
            assert has == (r["expected_risk"] == risk), r


def test_distractors_carry_no_risk():
    sentences = bank("distractor_neutral") + bank("distractor_positive")
    rows = [r for r in over_seeds("stable_neutral") if any(p in r["text"] for p in sentences)]
    assert len(rows) >= 5
    assert all(r["expected_risk"] == "none" for r in rows)
    assert {r["expected_label"] for r in rows} <= {"positive", "neutral"}
    assert any("itsemurha" in r["text"] or "suicid" in r["text"] for r in rows)


def test_stable_levels_are_ordered_and_without_risk():
    pos = {s: over_seeds(f"stable_{s}") for s in ("positive", "neutral", "low")}
    assert share(pos["positive"], "positive") > share(pos["neutral"], "positive")
    assert share(pos["neutral"], "positive") > share(pos["low"], "positive")
    assert share(pos["low"], "harmful") > share(pos["neutral"], "harmful")
    assert share(pos["neutral"], "harmful") > share(pos["positive"], "harmful")
    assert all(r["expected_risk"] == "none" for rows in pos.values() for r in rows)


def test_scenarios_share_draws_before_they_diverge():
    onset = round(DAYS / 3)
    key = ("ts", "language", "expected_label", "expected_risk")

    def before(rows):
        return [tuple(r[k] for k in key) for r in rows if day_of(r) < onset]

    assert before(gen("stress_period")) == before(gen("stable_neutral"))
    assert before(gen("withdrawal")) == before(gen("stable_neutral"))


def test_stress_period_more_harmful_then_recovers():
    onset = round(DAYS / 3)
    end = onset + max(3, DAYS // 3)
    assert hrv.stress_intensity(onset + 3, DAYS) == 1.0
    stress, base = over_seeds("stress_period"), over_seeds("stable_neutral")
    during = range(onset + 2, end)
    assert share(stress, "harmful", during) > share(base, "harmful", during) + 0.3
    after = range(end + 3, DAYS)
    assert share(stress, "harmful", after) == share(base, "harmful", after)
    texts = " ".join(r["text"] for r in stress if day_of(r) in during)
    assert "Deadline" in texts or "Tenttiviikko" in texts


def test_withdrawal_writes_less_and_shorter():
    rows = over_seeds("withdrawal")
    early = [r for r in rows if day_of(r) < DAYS // 3]
    late = [r for r in rows if day_of(r) >= DAYS - DAYS // 3]
    assert len(late) < 0.7 * len(early)
    assert statistics.fmean(len(r["text"]) for r in late) < statistics.fmean(
        len(r["text"]) for r in early
    )
    assert share(late, "harmful") > share(early, "harmful") + 0.25


def test_sudden_drop_has_one_bad_day():
    drop = DAYS // 2
    for seed in SEEDS:
        assert any(day_of(r) == drop for r in gen("sudden_drop", seed=seed))
    rows = over_seeds("sudden_drop")
    assert share(rows, "harmful", [drop]) > 0.8
    assert share(rows, "harmful", range(drop + 6, DAYS)) < 0.3


def test_crisis_escalates_to_risk_late():
    risk_start = round(0.7 * DAYS)
    rows = over_seeds("crisis")
    risky = [r for r in rows if r["expected_risk"] != "none"]
    assert risky
    assert all(day_of(r) >= risk_start for r in risky)
    for seed in SEEDS:  # always ends with a crisis entry
        last_day = [r for r in gen("crisis", seed=seed) if day_of(r) == DAYS - 1]
        assert last_day[-1]["expected_risk"] != "none"
    days_of = {k: [day_of(r) for r in risky if r["expected_risk"] == k] for k in RISKS[1:]}
    assert statistics.fmean(days_of["self_harm"]) < statistics.fmean(days_of["suicidal"])


def test_isolated_risk_has_exactly_one_crisis_entry():
    for seed in SEEDS:
        risky = [r for r in gen("isolated_risk", seed=seed) if r["expected_risk"] != "none"]
        assert len(risky) == 1
        assert day_of(risky[0]) == DAYS // 2


@pytest.mark.parametrize("seed", [1, 2])
def test_artifacts_change_text_only(seed):
    clean, noisy = gen("crisis", seed=seed), gen("crisis", seed=seed, artifacts=True)
    assert len(clean) == len(noisy)
    for c, n in zip(clean, noisy, strict=True):
        assert {k: v for k, v in c.items() if k != "text"} == {
            k: v for k, v in n.items() if k != "text"
        }
    assert sum(c["text"] != n["text"] for c, n in zip(clean, noisy, strict=True)) > len(clean) / 3


def test_entries_fall_in_the_waking_day():
    nights = sleep.nights(START, DAYS, "late_sleep_shift", seed=SEED)
    for seed in SEEDS:
        for r in gen(seed=seed, nights=nights):
            assert not any(n["bedtime"] <= r["ts"] < n["wake_time"] for n in nights)


@pytest.fixture
def user_id():
    with get_session() as s:
        uid = repo.create_user(s, "journal-sim-test")
    yield uid
    with get_session() as s:
        s.execute(text("DELETE FROM users WHERE id = :u"), {"u": uid})


def test_simulate_writes_and_replaces(user_id):
    end = START + timedelta(days=DAYS - 1)
    with get_session() as s:
        journal.simulate(s, user_id, START, DAYS, "stress_period", seed=SEED)
        repo.record_journal_entry(s, user_id, "Real entry", ts=ORIGIN + timedelta(hours=12))
    with get_session() as s:
        n = journal.simulate(s, user_id, START, DAYS, "crisis", seed=SEED)
        stored = repo.journal_entries(s, user_id, START, end)
    simulated = [e for e in stored if e.source != "app"]
    assert len(simulated) == n
    assert {e.source for e in simulated} == {"simulator:journal:crisis"}
    expected = gen("crisis")
    assert [(e.ts, e.text, e.expected_label, e.expected_risk) for e in simulated] == [
        (r["ts"], r["text"], r["expected_label"], r["expected_risk"]) for r in expected
    ]
    real = [e for e in stored if e.source == "app"]
    assert [(e.text, e.expected_label, e.language) for e in real] == [("Real entry", None, None)]

    with get_session() as s:
        repo.delete_source_data(s, user_id, journal.SOURCE_PREFIX)
        assert [e.text for e in repo.journal_entries(s, user_id, START, end)] == ["Real entry"]


def test_cli_writes_entries(user_id, capsys):
    journal.main(
        [
            "--user",
            str(user_id),
            "--scenario",
            "isolated_risk",
            "--days",
            "9",
            "--start",
            str(START),
            "--language",
            "fi",
            "--seed",
            "3",
        ]
    )
    assert "journal entries" in capsys.readouterr().out
    with get_session() as s:
        stored = repo.journal_entries(s, user_id, START, START + timedelta(days=8))
    assert stored
    assert {e.language for e in stored} == {"fi"}
    assert sum(e.expected_risk != "none" for e in stored) == 1
