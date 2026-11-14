# AGENTS.md

Wellbeing backend for Junction 2026: wearable-style data (heart rate + HRV, sleep, activity), mood check-ins and a feeling journal in one TimescaleDB, a FastAPI layer for the frontend, and simulators that generate realistic test data with ground truth. `README.md` is the user-facing reference for the schema, endpoints and every simulator scenario; read it before changing behavior it describes, and keep it up to date in the same change.

## Layout

All code lives in `backend/` (Python 3.12, package `app`):

- `app/db/`: SQLAlchemy models (`models.py`), session handling (`session.py`, `get_session()` commits on success and rolls back on error) and `repository.py`, the only place that reads or writes tables.
- `app/api/`: FastAPI app (`main.py`), shared dependencies (`deps.py`: per-request session, `PathUser`, validated date ranges), Pydantic schemas (`schemas.py`) and one router per resource in `routers/`.
- `app/simulators/`: one module per signal (`hrv`, `sleep`, `activity`, `screen`, `mood`, `journal`), plus shared code:
  - `common.py`: math helpers, seeded RNGs, profile lookup, artifact gaps, chunked `write()` and the shared CLI `parser()`.
  - `timelines.py`: day-by-day shapes of scenarios shared across simulators (`stress_period`, `sudden_drop`, `withdrawal`/`crisis`, `oversleep`, `late_sleep_shift`).
  - `sleep_window.py`: when the simulated user is asleep, either the built-in 23:00–07:00 UTC window or real nights from `sleep.nights(...)`.
- `app/inference/`: inference over the daily metrics. `anomalies.py` holds the detection rules (pure `find`) and `detect`, which stores them through the repository.
- `alembic/versions/`: numbered migrations (`0001_…`, `0002_…`).
- `tests/`: pytest suite, run against the real database.

## Commands

Everything runs in Docker; the DB must be up first.

```bash
docker compose up -d db                              # TimescaleDB on localhost:5432
docker compose run --rm migrate                      # apply migrations
docker compose run --rm --build migrate pytest -q    # tests (rebuild picks up code changes)
docker compose up -d api                             # API on http://localhost:8000/docs
docker compose run --rm migrate python -m app.simulators.<hrv|sleep|activity|screen|mood|journal> --new-user demo --scenario <name> --days 21 --seed 1
```

Lint and format from `backend/` before committing; CI (`.github/workflows/lint.yml`) fails on either:

```bash
uvx ruff check --fix . && uvx ruff format .
```

## Conventions

- **Data access goes through `repository.py`.** Routers and simulators call repository functions with a `Session`; don't put SQL in them.
- **Schema changes need an Alembic migration.** Add the next numbered file in `alembic/versions/`, and update `models.py` to match.
- **Times are UTC and days are UTC calendar days.** A sleep session counts toward the day the user wakes up. Daily metrics are aggregated from the hypertables on read; don't reintroduce Timescale continuous aggregates (they left backfilled history stale and were dropped in `0002`).
- **Heart, activity, screen, sleep, mood and journal rows carry a `source`** (default `device` for samples, `app` for mood check-ins and journal entries). Simulators tag rows `simulator:<signal>:<scenario>` and by default clear only the user's earlier rows with that prefix before writing (`--no-replace` keeps them), so real data survives a simulator rerun.
- **Simulator shape:** each module exposes `generate(...)` (pure, returns rows, no DB), `simulate(session, user_id, start, days, scenario, ...)` (writes) and `main()` (CLI built on `common.parser()`). Same-named scenarios must follow the same timeline in every simulator (use `timelines.py`), so data generated for one user lines up. Signals that depend on sleep take `nights=` from `sleep.nights(...)`.
- **Determinism:** with a seed, output must be reproducible. Keep RNG draws independent of the scenario where the module already does so (see `hrv.py`), so scenarios share noise and differ only in shape. Pure refactors should leave generated data byte-identical.
- **Journal ground truth:** simulated entries carry `expected_label` (`positive`/`neutral`/`harmful`) and `expected_risk` (`none`/`self_harm`/`suicidal`) for classifier evaluation. Crisis phrases stay first-person and non-graphic.
- **API:** no auth yet; the user is the `user_id` in the path (`PathUser` returns 404 for unknown users). Write routes call `db.commit()` themselves before returning. Keep range limits in `deps.py` (14-day default, 366 days max for day endpoints, 31 days for raw samples).
- **Style:** Ruff with line length 100 and the rule set in `pyproject.toml`; modules start with a docstring explaining what they model; use `from __future__ import annotations` and modern typing (`X | None`, `collections.abc`).

## Tests

Tests are integration tests against the containerized DB. Fixtures create a user and delete it afterwards (cascading to its data), so tests can run against a DB that also holds demo data. Add a test for each new repository function, endpoint or simulator scenario; simulator tests usually check `generate(...)` output directly and use the DB only for `simulate(...)`.

## Git

Work on a branch (`feat/…`, `refactor/…`) and open a PR into `main`; don't commit to `main` directly. Commit messages: imperative subject line, then a body explaining what changed and why.
