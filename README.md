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
