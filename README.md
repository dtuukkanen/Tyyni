# Junction2026 · Tyyni

Tyyni is a calm wellbeing companion. A wearable and the phone feed it heart rate, HRV, sleep, steps and screen time; the user adds a 1-tap mood check-in and a feeling journal. The backend notices when the user drifts from their own normal and suggests a small practice for it.

| Folder | What's in it |
|---|---|
| [`backend/`](backend) | TimescaleDB schema, FastAPI layer, anomaly detection, suggestions and test-data simulators (Python 3.12) |
| [`frontend/`](frontend) | Mobile-first Next.js app; see [`frontend/README.md`](frontend/README.md) |
| [`docs/`](docs) | Backend documentation, linked below |

## Quick start

Everything runs in Docker:

```bash
docker compose up -d db                     # TimescaleDB on localhost:5432
docker compose run --rm migrate             # apply migrations
docker compose up -d api                    # API docs on http://localhost:8000/docs
docker compose run --rm migrate python -m app.simulators.sleep \
  --new-user demo --scenario stress_period --days 21 --seed 1 --with-hrv --with-activity --with-screen
```

The last command creates a user named `demo` and fills three weeks of data in which a stress period starts after the first week.

## Documentation

| Page | Read it to… |
|---|---|
| [Architecture](docs/architecture.md) | see how the data flows, what each table holds and the rules every part follows |
| [API](docs/api.md) | call the backend from the frontend: endpoints, parameters, API key |
| [Anomaly detection](docs/inference/anomalies.md) | learn when a day counts as unusual for a user |
| [Suggestions](docs/inference/suggestions.md) | learn how anomalies become practices, and how feedback reorders them |
| [Simulators](docs/simulators/README.md) | generate realistic test data with known ground truth |
| [Development](docs/development.md) | run the tests, lint, write migrations, connect a SQL client |
| [Deployment](docs/deployment.md) | find out how the API runs on Vercel and the database on Neon |
