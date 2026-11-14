# API

[`backend/app/api`](../backend/app/api) is a FastAPI app over the [repository](architecture.md#using-the-repository-from-python), built for the frontend.

```bash
docker compose up -d api
```

Interactive docs are at <http://localhost:8000/docs>, and a typed client can be generated from <http://localhost:8000/openapi.json>. The service applies migrations first and reloads when files under `backend/app` change.

## Access

- **No user auth.** The user is the `user_id` in the path; an unknown id returns 404.
- **Shared API key.** When the server sets `API_KEY` (as the [deployment](deployment.md) does), every route needs it in the `X-API-Key` header; `/docs` and `/openapi.json` stay open. Locally it is unset and the API is open.
- **CORS** origins come from `CORS_ORIGINS` (default `http://localhost:5173,http://localhost:3000`).

## Endpoints

All user routes start with `/users/{id}`.

**Users and health**

| Endpoint | Returns |
|---|---|
| `GET /health` | `{"status": "ok"}` once the DB answers |
| `GET /users`, `POST /users` | All users; create one with `{"display_name": "demo"}` |
| `GET /users/{id}` | One user |

**Metrics**

| Endpoint | Returns |
|---|---|
| `GET …/today` | Everything the day view needs: today's metrics, the 14-day baseline, whether mood was logged, stored anomalies of yesterday and today, and today's stored suggestions |
| `GET …/daily?start=&end=` | One row per day with all metrics |
| `GET …/baseline?day=&window=14` | Mean of each metric over the `window` days before `day` |

**Raw data**

| Endpoint | Returns |
|---|---|
| `GET …/heart?start=&end=` | HR + HRV samples in `[start, end)` |
| `GET …/activity?start=&end=` | Activity samples |
| `GET …/screen?start=&end=` | Screen time samples |
| `GET …/sleep?start=&end=` | Sleep sessions by wake day, with `stages` and `efficiency` |
| `GET …/mood`, `POST …/mood` | Check-ins; post `{"score": 1–5, "note"?, "ts"?}` |
| `GET …/journal`, `POST …/journal` | Journal entries by UTC day; post `{"text": "...", "language"?: "fi"\|"en", "ts"?}` |

**Inference**

| Endpoint | Returns |
|---|---|
| `GET …/anomalies?start=&end=` | Stored [anomalies](inference/anomalies.md) by day |
| `POST …/anomalies/detect?start=&end=` | Detects anomalies again from the current data, stores and returns them |
| `GET …/suggestions?start=&end=` | Stored [suggestions](inference/suggestions.md) by day, each with its practice (`title`, `text`, `minutes`, `category`), the anomaly and `reason` it answers, and the latest feedback |
| `POST …/suggestions?day=` | Detects the anomalies of the day and the day before, adds suggestions for them and returns all of the day's suggestions. Calling it again keeps the ones already made |
| `POST …/suggestions/{sid}/feedback` | Post `{"done": true, "helped": true\|false\|null}` or `{"done": false}`; the latest answer counts and steers later suggestions |

**Simulated data**

| Endpoint | Returns |
|---|---|
| `GET /simulators` | The scenario names `simulate` takes, and each signal's own scenarios |
| `POST …/simulate` | Fills the user's signals with the [combined simulator](simulators/README.md#all-signals-at-once), then detects the period's anomalies and makes the last day's suggestions. Returns the seed, each signal's scenario and row count, the anomalies and the suggestions |

`simulate` takes a JSON body; every field is optional:

| Field | Default | Meaning |
|---|---|---|
| `scenario` | `stable_average` | The story; each signal follows the same name, its closest match, or its steady default |
| `days`, `end` | 21, today | UTC days `[end - days + 1, end]`; at most 90 days |
| `seed` | random | Same seed, same data; the response returns the one used |
| `signals` | all six | Any of `sleep`, `heart`, `activity`, `screen`, `mood`, `journal` |
| `scenarios` | `{}` | Set one signal's scenario directly, e.g. `{"journal": "crisis"}` |
| `artifacts`, `language`, `replace` | `false`, `mixed`, `true` | As the [CLI options](simulators/README.md#running-one) |
| `infer` | `true` | Detect anomalies and make suggestions afterwards |

It clears only the user's earlier simulated rows, so rerunning it on demo day keeps the data ending today. A [Bruno](https://www.usebruno.com) collection for it and the main reads is in [`bruno/`](../bruno).

## Date ranges

| Kind | Format | Default | Max |
|---|---|---|---|
| Day endpoints (`daily`, `sleep`, `mood`, `journal`, `anomalies`, `suggestions`, …) | dates, `2026-11-14` | last 14 days | 366 days |
| Raw samples (`heart`, `activity`, `screen`) | datetimes, `2026-11-14T08:00:00Z` | last 24 h | 31 days |

Times without a zone are UTC, and days are UTC calendar days. `day` defaults to today.

## Running on the host

With the DB container up and `DATABASE_URL` from `.env.example`, from `backend/`:

```bash
pip install -e ".[dev]" && uvicorn app.api.main:app --reload
```
