# Development

Everything runs in Docker. Start the database and apply migrations first:

```bash
docker compose up -d db
docker compose run --rm migrate
```

Defaults are dev-only; copy `.env.example` to `.env` to change credentials or ports.

## Database access

Connect a SQL client (e.g. DataGrip) to `localhost:5432`, database `wellbeing`, user `wellbeing`, password `wellbeing`.

To run Python on the host against the container, use `DATABASE_URL` from `.env.example` and install from `backend/`:

```bash
pip install -e ".[dev]"
```

## Tests

Integration tests run against the container DB. Each test creates its own user and deletes it afterwards, so the DB can also hold demo data.

```bash
docker compose run --rm --build migrate pytest -q   # --build picks up code changes
```

## Linting and formatting

Python code in `backend/` is linted and formatted with [Ruff](https://docs.astral.sh/ruff/) (config in `backend/pyproject.toml`). CI runs both checks on every push to `main` and every pull request. From `backend/`:

```bash
uvx ruff check --fix . && uvx ruff format .
```

The Next.js app in `frontend/` is linted with [Oxlint](https://oxc.rs/docs/guide/usage/linter) (config in `frontend/.oxlintrc.json`) and formatted with [Oxfmt](https://oxc.rs/docs/guide/usage/formatter) (config in `frontend/.oxfmtrc.json`). The same CI workflow runs `npm run lint` and `npm run format:check`; lint fails on warnings as well as errors. From `frontend/`:

```bash
npm run lint:fix   # apply safe fixes
npm run format     # format in place
npm run lint       # what CI runs
```

If a finding is a deliberate pattern, disable that one line with the reason: `// oxlint-disable-next-line <rule> -- <reason>`. The Stitch exports in `frontend/designs/` are excluded from both tools.

Or run the Python checks inside the container (Ruff is part of the `dev` extra):

```bash
docker compose run --rm --build migrate ruff check .
```

## Schema changes

Add the next numbered migration in [`backend/alembic/versions`](../backend/alembic/versions) (`0001_…`, `0002_…`) and update `backend/app/db/models.py` to match. For the hosted database, see [running migrations on Neon](deployment.md#running-migrations).

## Conventions

The rules for contributors and coding agents (data access, determinism, simulator shape, git workflow) are in [`AGENTS.md`](../AGENTS.md).
