# Junction2026

## Database

One containerized **PostgreSQL 16 + TimescaleDB** instance holds all data. Time series and relational data live side by side, so the inference logic can join heart rate, sleep, activity and mood in one query.

| Data | Shape | Storage |
|---|---|---|
| Heart rate + HRV (RMSSD) | high-frequency samples | hypertable `heart_samples` |
| Steps, active minutes, screen time | per-minute/hour counts | hypertable `activity_samples` |
| Sleep | one session per night | `sleep_sessions` (duration generated, stages in JSONB) |
| Mood check-in (1 tap) | one value per day | `mood_checkins` (score 1–5) |
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
| `GET /users/{id}/today` | Today's metrics, the 14-day baseline and whether mood was logged: everything the day view needs |
| `GET /users/{id}/daily?start=&end=` | One row per day with all metrics (default: the last 14 days; at most 366) |
| `GET /users/{id}/baseline?day=&window=14` | Mean of each metric over the `window` days before `day` |
| `GET /users/{id}/heart?start=&end=` | Raw HR + HRV samples in `[start, end)` (default: the last 24 h; at most 31 days) |
| `GET /users/{id}/activity?start=&end=` | Raw activity samples, same range rules as `heart` |
| `GET /users/{id}/sleep?start=&end=` | Sleep sessions by wake day, with `stages` and `efficiency` |
| `GET /users/{id}/mood?start=&end=`, `POST /users/{id}/mood` | Check-ins; post `{"score": 1–5, "note"?, "ts"?}` |

`start` / `end` are dates (`2026-11-14`) for day endpoints and datetimes (`2026-11-14T08:00:00Z`) for `heart` / `activity`; times without a zone are UTC. Days are UTC calendar days, as in the repository.

To run it on the host instead (with the DB container up and `DATABASE_URL` from `.env.example`), from `backend/`:

```bash
pip install -e ".[dev]" && uvicorn app.api.main:app --reload
```

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
- `--seed` and `--no-replace` work as for HRV.

```bash
docker compose run --rm migrate python -m app.simulators.sleep --new-user demo --scenario oversleep --days 21 --seed 1 --with-hrv --with-activity
```

From Python: `sleep.generate(...)` returns session rows, `sleep.simulate(session, user_id, start, days, scenario, ...)` writes them, and `hrv.generate(..., nights=sleep.nights(start, days, scenario, seed=...))` lines HRV up with the same nights (`activity.generate(..., nights=...)` likewise).

### Activity

[`backend/app/simulators/activity.py`](backend/app/simulators/activity.py) writes steps into `activity_samples` (one row per 15 min by default), tagged `simulator:activity:<scenario>`. Steps are simulated minute by minute: low-cadence incidental movement spread over the waking day, plus walks at ~110 steps/min — two commutes on weekdays (about 1 h and 10 h after waking), a midday walk on most weekend days, and sometimes an evening exercise walk. `active_minutes` counts the minutes with at least 100 steps (brisk walking); `screen_time_min` is not simulated and stays 0. Nobody walks while asleep: the nights are 23:00–07:00 UTC by default, or the real nights from the [sleep simulator](#sleep) when passed `nights=`, and the walks move with each day's wake time.

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
