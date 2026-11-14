# Journal simulator

[`backend/app/simulators/journal.py`](../../backend/app/simulators/journal.py) writes free-text feeling journal entries into `journal_entries`, tagged `simulator:journal:<scenario>`, so a classifier (Jev / Nemotron) can be built and evaluated before real users write anything.

## Ground truth

Each entry carries its expected classification:

| Field | Values |
|---|---|
| `expected_label` | `positive`, `neutral` or `harmful` (any distressing feeling: stress, anxiety, sadness, loneliness, bad sleep, hopelessness) |
| `expected_risk` | `none`, `self_harm` or `suicidal` (crisis content, only on harmful entries) |

## Texts

- On about 70 % of days the user writes 0–2 entries, the last one in the evening before bed.
- Texts are composed from Finnish and English phrase banks with natural inflections ("hyvä päivä", "kävin kävelyllä", "went for a walk", "viiltelin taas", "ajattelin itsemurhaa", "I keep thinking about suicide").
- Crisis sentences are first-person and non-graphic.
- About 8 % of positive / neutral entries are **distractors** that a keyword match gets wrong, labelled risk `none`: negation ("en ole enää ajatellut itsemurhaa"), third person or news ("documentary about suicide prevention") and hyperbole ("tämä tentti tappaa minut").

## Scenarios

| Scenario | What it produces |
|---|---|
| `stable_positive` / `stable_neutral` / `stable_low` | Steady mix: about 60 / 30 / 12 % positive and 5 / 15 / 50 % harmful entries, no crisis content |
| `stress_period` | Same timeline as the HRV scenario: harmful entries (deadlines, bad sleep, anxiety) rise to ~70 %, then recover |
| `withdrawal` | Same ramp as the activity scenario: fewer and shorter entries, more loneliness and staying home |
| `sudden_drop` | One very bad day on the HRV / activity `sudden_drop` day, recovering over ~3 days |
| `crisis` | From the first third, harmful entries take over; the last 30 % of days add crisis entries, self-harm first and suicidal later, and the last day always has one |
| `isolated_risk` | A steady neutral writer with a single crisis entry in the middle of the period |

## Options

Besides the [shared options](README.md#running-one):

- `--language fi|en|mixed` (default `mixed`: about 60 % Finnish, and about 10 % of entries switch language for one sentence).
- `--artifacts` adds phone-typing noise: lowercase, no punctuation, a typo, ä/ö typed as a/o, one-sentence entries. Rows, times and ground truth are unchanged.
- Replacing keeps entries written in the app (`source = 'app'`).

```bash
docker compose run --rm migrate python -m app.simulators.journal --new-user demo --scenario crisis --days 21 --seed 1
```
