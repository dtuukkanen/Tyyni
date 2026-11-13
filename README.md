# Junction2026

## Database

One containerized **PostgreSQL 16 + TimescaleDB** instance holds all data. Time series and relational data live side by side, so the inference logic can join heart rate, sleep, activity and mood in one query.

| Data | Shape | Storage |
|---|---|---|
| Heart rate + HRV (RMSSD) | high-frequency samples | hypertable `heart_samples` → daily continuous aggregate `heart_daily` |
| Steps, active minutes, screen time | per-minute/hour counts | hypertable `activity_samples` → `activity_daily` |
| Sleep | one session per night | `sleep_sessions` (duration generated, stages in JSONB) |
| Mood check-in (1 tap) | one value per day | `mood_checkins` (score 1–5) |
| Inference + escalation | relational | `anomalies`, `suggestions`, `suggestion_feedback`, `contacts`, `consents`, `alerts` |

The continuous aggregates use real-time aggregation, so freshly simulated data shows up in daily values right away. Samples carry a `source` column (e.g. `simulator:stress_week`) so simulated data can be told apart and cleared.

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

## Simulators

### HRV + heart rate

[`backend/app/simulators/hrv.py`](backend/app/simulators/hrv.py) writes realistic RMSSD and heart-rate samples (every 5 min by default) into `heart_samples`, tagged `simulator:hrv:<scenario>`. Every scenario has a night-time HRV rise (sleep 23:00–07:00 UTC), day-to-day and within-day noise, and HR that moves inversely to HRV.

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
