# Simulators

The simulators in [`backend/app/simulators`](../../backend/app/simulators) generate realistic data for one user, so the inference and the frontend can be built and evaluated before real users exist. Each run follows a **scenario** (a steady person, a stress period, a slow withdrawal, …) and is reproducible with a seed.

| Simulator | Writes | Page |
|---|---|---|
| `hrv` | Heart rate + HRV every 5 min | [HRV + heart rate](hrv.md) |
| `sleep` | One session per night; can also drive `hrv`, `activity` and `screen` | [Sleep](sleep.md) |
| `activity` | Steps and active minutes | [Activity](activity.md) |
| `screen` | Phone screen time | [Screen time](screen.md) |
| `mood` | The daily 1-tap check-in | [Mood](mood.md) |
| `journal` | Feeling journal entries with ground-truth labels | [Journal](journal.md) |

## Running one

```bash
docker compose run --rm migrate python -m app.simulators.<name> --new-user demo --scenario <scenario> --days 21 --seed 1
```

Every simulator takes these options:

| Option | Meaning |
|---|---|
| `--new-user NAME` / `--user ID` | Create a user, or write for an existing one |
| `--scenario` | Which story to tell; listed on each simulator's page |
| `--days` (default 21), `--start` | How many UTC days, and the first one (default: so the last day is today) |
| `--seed` | Makes the run reproducible |
| `--artifacts` | Adds real-world mess: gaps, a watch left off, typos. Each page says what |
| `--no-replace` | Keep earlier simulated rows. By default a rerun first clears the user's rows from the same simulator (`source` starting with `simulator:<signal>:`); real data from a device or the app is never touched |

## Scenarios line up across simulators

Scenarios with the same name follow the same day-by-day timeline everywhere ([`timelines.py`](../../backend/app/simulators/timelines.py)), so running several simulators for one user with the same `--days` gives one consistent story:

| Scenario | Timeline | Simulators |
|---|---|---|
| `stress_period` | Normal first third, 2-day onset, hold, 3-day recovery | all six |
| `sudden_drop` | One very bad day mid-period, recovering over a few days | hrv, activity, screen, mood, journal (sleep: `short_night`) |
| `withdrawal` | Normal first third, then a steady decline to the end | activity, screen, mood, journal |
| `crisis` | As `withdrawal`, with crisis journal entries in the last 30 % | mood, journal |
| `late_sleep_shift` | Bedtime 30 min later each night, up to +3 h | hrv, sleep, activity, screen, mood |
| `oversleep` | From the first third, ramping over 5 nights to about 10 h in bed | sleep, activity, screen, mood |

Signals that depend on sleep (HRV's night rise, when steps and screen use stop, when mood is logged and journals are written) use the built-in 23:00–07:00 UTC night unless given real nights from the sleep simulator. The easiest way to get that is `sleep --with-hrv --with-activity --with-screen`; see [Sleep](sleep.md).

## All signals at once

`combined` runs all six for one user with one scenario and one seed, the others following the sleep simulator's nights, then detects the period's anomalies and makes the last day's suggestions (`--no-infer` skips that):

```bash
docker compose run --rm migrate python -m app.simulators.combined --new-user demo --scenario withdrawal --days 21 --seed 1
```

A signal without the scenario follows its closest match (`sudden_drop` → sleep's `short_night`, `stable_good` → HRV's `stable_high`, …) or its steady default; `--signals` limits the run to some of them. The same run is available over HTTP as [`POST /users/{id}/simulate`](../api.md#endpoints), which also works on the deployed API.

The suggestions are for the last day, so pick a scenario that is still unusual then: `withdrawal`, `crisis`, `late_sleep_shift` and `oversleep` are, while `stress_period` has recovered by its last day (end it earlier with `end`, or show an earlier day).

## From Python

Every simulator has the same shape:

- `generate(...)` returns rows without touching the DB;
- `simulate(session, user_id, start, days, scenario, ...)` writes them;
- signals that depend on sleep take `nights=sleep.nights(start, days, scenario, seed=...)`.
