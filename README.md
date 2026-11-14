# Junction2026

## Database

One containerized **PostgreSQL 16 + TimescaleDB** instance holds all data locally; the hosted database is Neon (see [Neon](#neon)). Time series and relational data live side by side, so the inference logic can join heart rate, sleep, activity and mood in one query.

| Data | Shape | Storage |
|---|---|---|
| Heart rate + HRV (RMSSD) | high-frequency samples | hypertable `heart_samples` |
| Steps, active minutes | per-minute/hour counts | hypertable `activity_samples` |
| Phone screen time | minutes per interval | hypertable `screen_samples` (its own source: the phone, not the wearable) |
| Sleep | one session per night | `sleep_sessions` (duration generated, stages in JSONB) |
| Mood check-in (1 tap) | one value per day | `mood_checkins` (score 1–5, `source` tells simulated check-ins from ones made in the app) |
| Feeling journal | free-text entries, Finnish or English | `journal_entries` (simulated entries carry ground-truth `expected_label` / `expected_risk`) |
| Inference + escalation | relational | `anomalies`, `suggestions`, `suggestion_feedback`, `contacts`, `consents`, `alerts` |

Daily values (`repository.daily_metrics`) are aggregated from the hypertables on read, so freshly simulated, backfilled or deleted data is reflected right away, even inside the transaction that wrote it. (Timescale continuous aggregates were tried and dropped: real-time aggregation only covers rows newer than the last refresh, so backfilled history stayed stale.) Samples carry a `source` column (e.g. `simulator:stress_week`) so simulated data can be told apart and cleared.

### Running it

```bash
docker compose up -d db
```

```bash
docker compose run --rm migrate
```

Run the tests (against the container DB):

```bash
docker compose run --rm --build migrate pytest -q
```

Connect a SQL client (e.g. DataGrip) to `localhost:5432`, database `wellbeing`, user `wellbeing`, password `wellbeing`.

Defaults are dev-only; copy `.env.example` to `.env` to change credentials or ports.

### Neon

The hosted database is the Neon project `tyyni-db` (Free plan, PostgreSQL 18, `aws-eu-central-1` Frankfurt). Its `production` branch holds the data; the Neon–Vercel integration also created a `vercel-dev` branch and put `DATABASE_URL` / `DATABASE_URL_UNPOOLED` in the Vercel project. The Free plan never bills: when its monthly compute or network transfer allowance runs out, the compute is suspended until the next month.

Neon's TimescaleDB is the Apache-licensed build: hypertables work, continuous aggregates don't. The migrations check what the server offers, so the same history runs everywhere:

| Server | Sample tables | Continuous aggregates (dropped again in `0002`) |
|---|---|---|
| Local `timescale/timescaledb` image | hypertables | created |
| Neon | hypertables | skipped |
| PostgreSQL without TimescaleDB | plain tables (`test_hypertables_exist` is skipped) | skipped |

Run migrations against Neon over the **direct** connection string (no `-pooler` in the host); the pooled one goes through PgBouncer, which breaks session state that migrations rely on. Try a migration on a throwaway branch first:

```bash
neon branches create --project-id young-waterfall-75387175 --name migration-test --parent production
URL=$(neon connection-string --project-id young-waterfall-75387175 --branch migration-test \
  --database-name neondb | sed 's#^postgresql://#postgresql+psycopg://#')
docker compose run --rm --no-deps -e DATABASE_URL="$URL" migrate      # or: ... migrate pytest -q
neon branches delete migration-test --project-id young-waterfall-75387175
```

Use `--branch production` for the real database. Application traffic (the API) should use the pooled string (`neon connection-string --pooled`).

### Using it from Python

All reads and writes go through [`backend/app/db/repository.py`](backend/app/db/repository.py):

```python
from app.db import get_session
from app.db import repository as repo

with get_session() as s:
    uid = repo.create_user(s, "demo")
    repo.insert_heart_samples(s, [{"user_id": uid, "ts": ts, "hr_bpm": 64, "hrv_rmssd_ms": 48, "source": "simulator:normal"}])
    repo.insert_sleep_session(s, uid, bedtime, wake_time, efficiency=0.9)
    repo.record_mood(s, uid, score=4)

    days = repo.daily_metrics(s, uid, start, end)          # one row per day, all metrics
    baseline = repo.rolling_baseline(s, uid, day, window=14)  # mean of the 14 days before `day`
```

Days are UTC calendar days; a sleep session counts toward the day the user woke up. Schema changes go through Alembic (`backend/alembic/versions`).

## API

[`backend/app/api`](backend/app/api) is a FastAPI app over the repository, for the frontend. It has no auth yet: the user is the `user_id` in the path.

```bash
docker compose up -d api
```

Interactive docs are at <http://localhost:8000/docs>. A frontend can generate a typed client from <http://localhost:8000/openapi.json>. The service applies migrations first and reloads when files under `backend/app` change. Allowed CORS origins come from `CORS_ORIGINS` (default: `http://localhost:5173,http://localhost:3000`).

| Endpoint | What it returns |
|---|---|
| `GET /health` | `{"status": "ok"}` once the DB answers |
| `GET /users`, `POST /users` | All users; create one with `{"display_name": "demo"}` |
| `GET /users/{id}` | One user (404 if unknown) |
| `GET /users/{id}/today` | Today's metrics, the 14-day baseline, whether mood was logged, the stored anomalies of yesterday and today and today's stored suggestions: everything the day view needs |
| `GET /users/{id}/daily?start=&end=` | One row per day with all metrics (default: the last 14 days; at most 366) |
| `GET /users/{id}/baseline?day=&window=14` | Mean of each metric over the `window` days before `day` |
| `GET /users/{id}/heart?start=&end=` | Raw HR + HRV samples in `[start, end)` (default: the last 24 h; at most 31 days) |
| `GET /users/{id}/activity?start=&end=` | Raw activity samples, same range rules as `heart` |
| `GET /users/{id}/screen?start=&end=` | Raw screen time samples, same range rules as `heart` |
| `GET /users/{id}/sleep?start=&end=` | Sleep sessions by wake day, with `stages` and `efficiency` |
| `GET /users/{id}/mood?start=&end=`, `POST /users/{id}/mood` | Check-ins; post `{"score": 1–5, "note"?, "ts"?}` |
| `GET /users/{id}/journal?start=&end=`, `POST /users/{id}/journal` | Journal entries by UTC day; post `{"text": "...", "language"?: "fi"\|"en", "ts"?}` |
| `GET /users/{id}/anomalies?start=&end=` | Stored [anomalies](#anomaly-detection) by day |
| `POST /users/{id}/anomalies/detect?start=&end=` | Detects the anomalies again from the current data, stores them and returns them (default: the last 14 days) |
| `GET /users/{id}/suggestions?start=&end=` | Stored [suggestions](#suggestions) by day, each with its practice (`title`, `text`, `minutes`, `category`), the anomaly and `reason` it answers and the latest feedback (`done`, `helped`) |
| `POST /users/{id}/suggestions?day=` | Detects the anomalies of the day and the day before, adds suggestions for them and returns all of the day's suggestions (default: today). Calling it again keeps the ones already made |
| `POST /users/{id}/suggestions/{sid}/feedback` | Post `{"done": true, "helped": true\|false\|null}` or `{"done": false}`; the latest answer counts and steers later suggestions |

`start` / `end` are dates (`2026-11-14`) for day endpoints and datetimes (`2026-11-14T08:00:00Z`) for `heart` / `activity`; times without a zone are UTC. Days are UTC calendar days, as in the repository.

To run it on the host instead (with the DB container up and `DATABASE_URL` from `.env.example`), from `backend/`:

```bash
pip install -e ".[dev]" && uvicorn app.api.main:app --reload
```

## Anomaly detection

[`backend/app/inference/anomalies.py`](backend/app/inference/anomalies.py) compares each day's metrics with the user's own normal and stores what stands out in `anomalies`. The baseline for a day is the median of the 14 days before it, and its spread is the median absolute deviation. Days on which an anomaly fired are left out, so a stress week neither becomes the new normal nor hides itself by widening the spread. A metric is judged once it has 7 normal days with data. A lasting change becomes the new normal after about two weeks.

A rule fires when a metric is at least 2.5 spreads out *and* moves by at least its minimum change, so a very steady user isn't flagged for trivia:

| Kind | Fires on |
|---|---|
| `stress` | HRV ≥ 25 % lower, or heart rate ≥ 6 bpm higher |
| `short_sleep` / `long_sleep` | Time in bed ≥ 90 min shorter / longer |
| `sleep_shift` | Bedtime or wake time ≥ 1.5 h later |
| `low_activity` | Steps ≥ 40 % fewer |
| `screen_time` | Screen time ≥ 40 % more |
| `low_mood` | The mood check-ins have dropped; see [below](#low-mood) |

Each anomaly is one row per day and kind. `metric` / `value` / `baseline` hold the most deviating metric. `explanation` holds a `summary` ("HRV 31 ms vs usual 47 ms (-34 %); heart rate 76 bpm vs usual 64 bpm (+12 bpm)"), every `signal` that fired with its `z`, and `escalation`. An anomaly is `attention`, or `critical` when it is:

- `extreme`: a metric is at least 4 spreads out and moves by twice the minimum change,
- `sustained`: the same kind fired 3 days in a row,
- `multiple_signals`: 3 or more kinds fired on the same day.

Heart rate and steps are judged once a day is over (a half day always looks inactive), so today only gets sleep and mood anomalies. Detection is explicit: run it after writing data, and a rerun updates anomalies in place (they keep their id) and removes ones that no longer fire. Gradual drifts (`withdrawal`, `late_sleep_shift`) are caught only partly, since the baseline moves with them.

```bash
docker compose run --rm migrate python -m app.inference.anomalies --user <id> --days 21
```

From Python: `anomalies.find(daily_rows, start, end, today=...)` is pure (rows of `repository.daily_metrics` in, anomaly rows out); `anomalies.detect(session, user_id, start, end)` reads, stores and returns them.

### Low mood

The 1-tap mood is one score from 1 to 5 a day, too coarse for a median and its absolute deviation: a user who always taps 4 would get a critical anomaly from a single 2, and a user who wobbles between 3 and 5 would never be flagged. So `low_mood` has its own rule. On each day with a check-in it compares today's score and the *recent mood* (the mean of the last 3 check-ins within 4 days) with the *usual mood*: the mean and standard deviation (at least 0.5) of the normal check-ins in the 14 days before those 4, so the first low days of a dip don't drag the usual mood down before it fires. It needs 7 such check-ins. It fires on:

- a dip: today's check-in and the recent mood are both ≥ 1 point below usual, and the recent mood is ≥ 1.5 deviations below it. One bad check-in among good ones is not a dip.
- a sharp drop: today's check-in alone is ≥ 2 points and ≥ 3 deviations below usual (a bad day for a steady user, not for a wobbly one).
- a very low mood: the last 3 check-ins average 1.5 or less. This needs no usual mood and never becomes the new normal, so a new user or a slow decline (`crisis`) is still caught.

A low mood is `critical` when it is very low (`very_low`) or the recent mood is ≥ 2 points below usual (`extreme`), besides `sustained` and `multiple_signals`. The `low_mood` signal holds today's check-in as `value`, the usual mood as `baseline` (`null` without one) and the recent mood as `recent`; its summary reads "mood 2.0/5 vs usual 3.9/5 (-1.9), last 3 check-ins 2.3/5". Over 200 seeds of the 21-day [mood scenarios](#mood), a stable user gets a `low_mood` in about 1 run in 8 and a critical one in about 1 in 100 (`stable_low` more often, since its user does have runs of 1s), while it fires in about three quarters of `stress_period` runs and nine in ten `crisis` runs.

## Suggestions

[`backend/app/inference/suggestions.py`](backend/app/inference/suggestions.py) turns the anomalies into a few small practices and stores them in `suggestions`; the user's answers go to `suggestion_feedback`. The practices (`CATALOG`) match the ones in the app: box breathing, the double inhale sigh, a body scan, a slow walk, nearby nature, a stretch, calm sounds, 5-4-3-2-1 grounding, a screen-free wind-down, an earlier night, a short rest, morning daylight, a regular wake-up time, a phone-free hour, writing it down, reaching out to a friend, and talking to someone today.

Each anomaly kind has its practices in order (`FOR_KIND`):

| Anomaly | Practices, best first |
|---|---|
| `stress` | box breathing, double inhale sigh, slow walk, body scan, calm sounds |
| `short_sleep` | screen-free wind-down, earlier night, short rest, body scan |
| `long_sleep` | morning daylight, regular wake-up, slow walk, reach out to a friend |
| `sleep_shift` | screen-free wind-down, morning daylight, regular wake-up, phone-free hour; led by a late wake-up: morning daylight, regular wake-up, slow walk |
| `low_activity` | slow walk, nearby nature, stretch |
| `screen_time` | phone-free hour, nearby nature, screen-free wind-down, grounding |
| `low_mood` | nearby nature, reach out to a friend, writing it down, grounding, calm sounds |

Suggestions for a day answer the anomalies of that day and the day before (heart rate and steps are judged once a day is over), at most 3 a day:

- A kind that fired on both days counts once, as today's anomaly.
- Critical anomalies come first. A very low mood (`very_low`) gets *talk to someone today*, with the MIELI crisis line and 112, ahead of everything else and every day while it lasts. Another critical low mood, or a critical anomaly with several signals at once (`multiple_signals`), gets *reach out to a friend* first. A critical anomaly that is only `sustained` or `extreme` gets no support practice, so a long stress week doesn't nudge the user to message someone every day.
- The anomalies take turns, so two anomalies get one practice each before either gets a second. An anomaly that already has suggestions gets no more.
- A practice suggested in the 2 days before waits until the others are used up, so the user isn't told the same thing every day.
- Feedback reorders the practices: the share of times a practice helped, smoothed towards one half, where skipping it counts as half a "didn't help". Three "helped" lift a practice about three places; three "didn't help" drop it as far.

Making suggestions again on the same day only adds ones for new anomalies, so the list the user already saw stays put. A suggestion keeps its `reason` (the anomaly's summary) after re-detection removes its anomaly. Over 5 seeds of the 21-day scenarios with every simulator, a stable user gets no suggestions; `stress_period` gets them on about 7 days, led by box breathing and the double inhale sigh; `oversleep` on about 8, led by morning daylight and a regular wake-up.

```bash
docker compose run --rm migrate python -m app.inference.suggestions --user <id> --day 2026-11-14
```

From Python: `suggestions.choose(anomalies, history, day)` is pure (anomalies and earlier suggestions with their feedback in, new suggestions out); `suggestions.suggest(session, user_id, day)` detects, stores and returns the day's suggestions.

## Simulators

### HRV + heart rate

[`backend/app/simulators/hrv.py`](backend/app/simulators/hrv.py) writes realistic RMSSD and heart-rate samples (every 5 min by default) into `heart_samples`, tagged `simulator:hrv:<scenario>`. Every scenario has a night-time HRV rise (sleep 23:00–07:00 UTC by default, or the real nights from the [sleep simulator](#sleep) when passed `nights=`), day-to-day and within-day noise, and HR that moves inversely to HRV.

| Scenario | What it produces |
|---|---|
| `stable_high` / `stable_average` / `stable_low` | Steady person with RMSSD ≈ 75 / 45 / 22 ms (resting HR ≈ 55 / 63 / 72) |
| `rising` / `lowering` | HRV goes up / down by about ±25 % |
| `alternating` | Good / bad swings of about ±20–25 % |
| `stress_period` | Normal first third, drops to ~60 % over 2 days, holds, recovers over 3 days |
| `sudden_drop` | Normal, then one day at ~50 % and an exponential recovery |
| `late_sleep_shift` | Bedtime moves 30 min later each night (up to +3 h), so the night HRV peak shifts later |

- `--timescale days|intraday` (for `rising`, `lowering`, `alternating`): `days` shapes the whole period, so the daily averages move; `intraday` repeats the shape within each day's waking hours and leaves the daily averages flat.
- `--artifacts` adds sensor noise to any scenario: 1–3 h gaps (watch off) and occasional spikes.
- `--seed` makes a run reproducible. A rerun clears the user's earlier HRV simulator data unless you pass `--no-replace`.

```bash
docker compose run --rm migrate python -m app.simulators.hrv --new-user demo --scenario stress_period --days 21 --seed 1
```

From Python: `hrv.generate(...)` returns rows without touching the DB; `hrv.simulate(session, user_id, start, days, scenario, ...)` writes them.

### Sleep

[`backend/app/simulators/sleep.py`](backend/app/simulators/sleep.py) writes one `sleep_sessions` row per night, tagged `simulator:sleep:<scenario>`. `--days 21` gives 21 sessions, one for each wake day (a session counts toward the day the user wakes up). Each night has bedtime and wake jitter, an efficiency (time asleep / time in bed), and `stages` in minutes (`deep`, `rem`, `light`, `awake`, summing to the time in bed). Deep sleep stays fairly constant, so short nights mostly lose REM.

| Scenario | What it produces |
|---|---|
| `stable_good` / `stable_average` / `stable_poor` | 22:45–07:00 at 92 % / 23:00–07:00 at 88 % / 23:45–06:45 at 78 % efficiency; the poor sleeper is also less regular |
| `weekend_shift` | Friday and Saturday nights: bed 1.5 h later, wake 2 h later (social jetlag) |
| `late_sleep_shift` | Same as the HRV scenario: bedtime 30 min later each night (up to +3 h), wake only 0.8× as much later, so nights get shorter |
| `oversleep` | From the first third, ramps over 5 nights to bed +1.5 h and wake +3.5 h: about 10 h in bed, lower efficiency |
| `stress_period` | Same timeline as the HRV scenario: later to bed, earlier awake, efficiency −15 points, less deep sleep, more irregular |
| `short_night` | One ~3.5 h night (02:30–06:00) waking on the HRV `sudden_drop` day, then a longer rebound night |

- `--artifacts` drops about 10 % of the nights (watch off); the remaining nights are unchanged.
- `--with-hrv` also writes HRV + heart rate whose night-time rise follows these exact nights (poorer nights restore less). The HRV scenario is matched to the sleep scenario (e.g. `stress_period` → `stress_period`, `short_night` → `sudden_drop`, otherwise `stable_average`); override it with `--hrv-scenario`.
- `--with-activity` also writes [steps](#activity) that stop while asleep and follow these wake times. The activity scenario is matched the same way (`stable_good` → `stable_active`, `stable_poor` → `stable_sedentary`, `short_night` → `sudden_drop`, same name for `stress_period` / `oversleep` / `late_sleep_shift`, otherwise `stable_average`); override it with `--activity-scenario`.
- `--with-screen` also writes [screen time](#screen-time) that stops at these bedtimes and follows these wake times. The screen time scenario is matched like the activity one (`stable_good` → `stable_light`, `stable_poor` → `stable_heavy`, `short_night` → `sudden_drop`, same name for `stress_period` / `oversleep` / `late_sleep_shift`, otherwise `stable_average`); override it with `--screen-scenario`.
- `--seed` and `--no-replace` work as for HRV.

```bash
docker compose run --rm migrate python -m app.simulators.sleep --new-user demo --scenario oversleep --days 21 --seed 1 --with-hrv --with-activity --with-screen
```

From Python: `sleep.generate(...)` returns session rows, `sleep.simulate(session, user_id, start, days, scenario, ...)` writes them, and `hrv.generate(..., nights=sleep.nights(start, days, scenario, seed=...))` lines HRV up with the same nights (`activity.generate(..., nights=...)` likewise).

### Activity

[`backend/app/simulators/activity.py`](backend/app/simulators/activity.py) writes steps into `activity_samples` (one row per 15 min by default), tagged `simulator:activity:<scenario>`. Steps are simulated minute by minute: low-cadence incidental movement spread over the waking day, plus walks at ~110 steps/min — two commutes on weekdays (about 1 h and 10 h after waking), a midday walk on most weekend days, and sometimes an evening exercise walk. `active_minutes` counts the minutes with at least 100 steps (brisk walking); screen time has its [own simulator](#screen-time). Nobody walks while asleep: the nights are 23:00–07:00 UTC by default, or the real nights from the [sleep simulator](#sleep) when passed `nights=`, and the walks move with each day's wake time.

| Scenario | What it produces |
|---|---|
| `stable_active` / `stable_average` / `stable_sedentary` | Steady ≈ 12k / 7k / 3.5k steps a day (≈ 50 / 25 / 10 active minutes) |
| `stress_period` | Same timeline as the HRV scenario: fewer steps and almost no exercise (about −35 %), then recovers |
| `withdrawal` | From the first third, a gradual decline to under half the steps: exercise stops, walks shrink (staying home) |
| `sudden_drop` | One near-bed-rest day (~20 % of the steps, no active minutes) on the HRV `sudden_drop` day, recovering over ~3 days |
| `late_sleep_shift` | The day follows the HRV scenario's later wake times (up to ~2.4 h later), slightly less exercise |
| `oversleep` | Same ramp as the sleep scenario: about −30 % incidental steps and little exercise |

- `--interval` sets the minutes per row (must divide a day); daily totals don't depend on it.
- `--artifacts` drops 1–3 h gaps on about half the days and about 5 % of whole days (device not carried); the remaining rows are unchanged.
- `--seed` and `--no-replace` work as for HRV.

```bash
docker compose run --rm migrate python -m app.simulators.activity --new-user demo --scenario withdrawal --days 21 --seed 1
```

From Python: `activity.generate(...)` returns rows, `activity.simulate(session, user_id, start, days, scenario, ...)` writes them; pass `nights=sleep.nights(...)` to line the waking hours up with simulated sleep.

### Screen time

[`backend/app/simulators/screen.py`](backend/app/simulators/screen.py) writes phone screen time into `screen_samples` (minutes the screen was on, one row per 15 min by default), tagged `simulator:screen:<scenario>`. Screen time comes from the phone, not the wearable, so it has its own table; a rerun of the activity or screen simulator never touches the other's rows. Each day has a budget (the person's usual screen time, the scenario, a small weekend lift and day-to-day noise) spread over the waking day: a check in bed right after waking, a lunch bump, a rise through the evening and scrolling in bed in the hour before sleep. Minute by minute the screen is then on or off in sessions of about 2 minutes, so use comes in realistic bursts. Nobody uses the phone while asleep: the nights are 23:00–07:00 UTC by default, or the real nights from the [sleep simulator](#sleep) when passed `nights=`; minutes after midnight before a late bedtime still count as the previous evening.

| Scenario | What it produces |
|---|---|
| `stable_light` / `stable_average` / `stable_heavy` | Steady ≈ 2 / 3.5 / 5.4 h a day |
| `stress_period` | Same timeline as the HRV scenario: about +60 % while the stress holds (≈ 5.5 h), then recovers |
| `withdrawal` | Same ramp as the activity scenario: rising to about double (≈ 7 h) by the end, the time steps were lost to |
| `sudden_drop` | About +80 % on the HRV / activity `sudden_drop` day, recovering over ~3 days |
| `late_sleep_shift` | The phone stays on as bedtime slips later (up to 3 h): more scrolling in bed, ≈ +25 % in total |
| `oversleep` | Same ramp as the sleep scenario: lying in bed with the phone in the morning, ≈ +25 % in total |

With the [`screen_time` rule](#anomaly-detection) (≥ 40 % more than usual), 100 seeds of 21 days give a `screen_time` anomaly in 0–9 % of stable runs (never critical), 93 % of `stress_period`, 91 % of `withdrawal` and every `sudden_drop` run. The rule is relative, like `low_activity`, because an absolute hour is noise for a heavy user and a big change for a light one.

- `--interval` sets the minutes per row (must divide a day); daily totals don't depend on it.
- `--artifacts` drops 1–3 h gaps on about half the days (phone off) and about 3 % of whole days; the remaining rows are unchanged.
- `--seed` and `--no-replace` work as for HRV; replacing keeps screen time from a device (`source = 'device'`).

```bash
docker compose run --rm migrate python -m app.simulators.screen --new-user demo --scenario withdrawal --days 21 --seed 1
```

From Python: `screen.generate(...)` returns rows, `screen.simulate(session, user_id, start, days, scenario, ...)` writes them; pass `nights=sleep.nights(...)` to line the waking hours up with simulated sleep.

### Mood

[`backend/app/simulators/mood.py`](backend/app/simulators/mood.py) writes the daily 1-tap check-in into `mood_checkins`, tagged `simulator:mood:<scenario>`, so the inference and learning loop have the user's own ground truth to work with. On about 85 % of days the user checks in once in the evening (0.5–2.5 h before bed, never after midnight UTC, so the check-in counts toward its own day). The score is a latent mood rounded to 1–5: the person's usual level, the scenario's shift, last night's sleep (a poor night lowers it), a small weekend lift, and day-to-day noise that carries over (a bad day tends to follow a bad day).

| Scenario | What it produces |
|---|---|
| `stable_good` / `stable_average` / `stable_low` | Steady mood ≈ 4.0 / 3.4 / 2.5 |
| `stress_period` | Same timeline as the HRV scenario: about −1.3 while the stress holds, then recovers |
| `withdrawal` | Same ramp as the activity scenario: mood down about −1.2 by the end, and check-ins drop to about half |
| `sudden_drop` | About −2 on the HRV / activity `sudden_drop` day, recovering over ~3 days |
| `late_sleep_shift` / `oversleep` | Follow the sleep scenarios: up to about −0.5 / −0.8 by the end |
| `crisis` | Same ramp as the journal scenario: mood falls to 1–2 by the end, and check-ins get rarer |

- `--artifacts` drops 2–4 day streaks (app not opened) and adds the odd double tap (the same score again a minute later); the other check-ins are unchanged.
- `--seed` and `--no-replace` work as for HRV; replacing keeps check-ins made in the app (`source = 'app'`).

```bash
docker compose run --rm migrate python -m app.simulators.mood --new-user demo --scenario stress_period --days 21 --seed 1
```

From Python: `mood.generate(...)` returns rows, `mood.simulate(session, user_id, start, days, scenario, ...)` writes them; pass `nights=sleep.nights(...)` to time the check-ins before the simulated bedtimes and let each night's efficiency move the next day's mood.

### Journal

[`backend/app/simulators/journal.py`](backend/app/simulators/journal.py) writes free-text feeling journal entries into `journal_entries`, tagged `simulator:journal:<scenario>`, so a classifier (Jev / Nemotron) can be built and evaluated before real users write anything. Each entry carries its ground truth:

- `expected_label`: `positive`, `neutral` or `harmful` (any distressing feeling: stress, anxiety, sadness, loneliness, bad sleep, hopelessness)
- `expected_risk`: `none`, `self_harm` or `suicidal` (crisis content, only on harmful entries)

On about 70 % of days the user writes 0–2 entries (the last one in the evening before bed). Texts are composed from Finnish and English phrase banks with natural inflections ("hyvä päivä", "kävin kävelyllä", "went for a walk", "viiltelin taas", "ajattelin itsemurhaa", "I keep thinking about suicide"); crisis sentences are first-person and non-graphic. About 8 % of positive / neutral entries are distractors that a keyword match gets wrong, labelled risk `none`: negation ("en ole enää ajatellut itsemurhaa"), third person or news ("documentary about suicide prevention") and hyperbole ("tämä tentti tappaa minut").

| Scenario | What it produces |
|---|---|
| `stable_positive` / `stable_neutral` / `stable_low` | Steady mix: about 60 / 30 / 12 % positive and 5 / 15 / 50 % harmful entries, no crisis content |
| `stress_period` | Same timeline as the HRV scenario: harmful entries (deadlines, bad sleep, anxiety) rise to ~70 %, then recover |
| `withdrawal` | Same ramp as the activity scenario: fewer and shorter entries, more loneliness and staying home |
| `sudden_drop` | One very bad day on the HRV / activity `sudden_drop` day, recovering over ~3 days |
| `crisis` | From the first third, harmful entries take over; the last 30 % of days add crisis entries, self-harm first and suicidal later, and the last day always has one |
| `isolated_risk` | A steady neutral writer with a single crisis entry in the middle of the period |

- `--language fi|en|mixed` (default `mixed`: about 60 % Finnish, and about 10 % of entries switch language for one sentence).
- `--artifacts` adds phone-typing noise: lowercase, no punctuation, a typo, ä/ö typed as a/o, one-sentence entries. Rows, times and ground truth are unchanged.
- `--seed` and `--no-replace` work as for HRV; replacing keeps entries written in the app (`source = 'app'`).

```bash
docker compose run --rm migrate python -m app.simulators.journal --new-user demo --scenario crisis --days 21 --seed 1
```

From Python: `journal.generate(...)` returns rows, `journal.simulate(session, user_id, start, days, scenario, ...)` writes them; pass `nights=sleep.nights(...)` to time the entries within the simulated waking day.

## Linting & formatting

Python code in `backend/` is linted and formatted with [Ruff](https://docs.astral.sh/ruff/) (config in `backend/pyproject.toml`). CI runs both checks on every push to `main` and every pull request.

Fix lint issues and format, from `backend/`:

```bash
uvx ruff check --fix . && uvx ruff format .
```

Or inside the container (Ruff is part of the `dev` extra):

```bash
docker compose run --rm --build migrate ruff check .
```
