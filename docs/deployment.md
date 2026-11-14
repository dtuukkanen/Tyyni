# Deployment

| Part | Where | URL |
|---|---|---|
| API | Vercel project `tyyni-api`, region `fra1` | <https://tyyni-api.vercel.app> |
| Database | Neon project `tyyni-db`, `aws-eu-central-1` (Frankfurt) | — |
| Frontend | Vercel project `tyyni`; see [`frontend/README.md`](../frontend/README.md#deploy-vercel) | <https://tyyni-seven.vercel.app> |

All three sit in Frankfurt, on free plans that pause instead of billing when a limit is hit.

## API on Vercel

The project's root directory is `backend`:

- `index.py` exposes the app for Vercel's FastAPI preset;
- `.python-version` pins Python 3.12;
- `vercel.json` sets the region and keeps tests and migrations out of the bundle.

Pushes to `main` deploy to production; other branches get preview deployments, which use the same database. **Migrations are not run on deploy**; run them [by hand](#running-migrations).

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon's **pooled** connection string, with the `postgresql+psycopg://` scheme |
| `API_KEY` | Shared secret checked in the `X-API-Key` header (see [API access](api.md#access)) |

The frontend project holds the same key as `PYTHON_SERVICE_API_KEY` and the URL as `PYTHON_SERVICE_URL`. It calls the API only from its server, so the key never reaches the browser.

## Neon

The hosted database is the Neon project `tyyni-db` (Free plan, PostgreSQL 18). Its `production` branch holds the data; the Neon–Vercel integration also created a `vercel-dev` branch and put `DATABASE_URL` / `DATABASE_URL_UNPOOLED` in the Vercel project. When the Free plan's monthly compute or network transfer allowance runs out, the compute is suspended until the next month.

Neon's TimescaleDB is the Apache-licensed build: hypertables work, continuous aggregates don't. The migrations check what the server offers, so the same history runs everywhere:

| Server | Sample tables | Continuous aggregates (dropped again in `0002`) |
|---|---|---|
| Local `timescale/timescaledb` image | hypertables | created |
| Neon | hypertables | skipped |
| PostgreSQL without TimescaleDB | plain tables (`test_hypertables_exist` is skipped) | skipped |

### Running migrations

Use the **direct** connection string (no `-pooler` in the host): the pooled one goes through PgBouncer, which breaks session state that migrations rely on. Try a migration on a throwaway branch first:

```bash
neon branches create --project-id young-waterfall-75387175 --name migration-test --parent production
URL=$(neon connection-string --project-id young-waterfall-75387175 --branch migration-test \
  --database-name neondb | sed 's#^postgresql://#postgresql+psycopg://#')
docker compose run --rm --no-deps -e DATABASE_URL="$URL" migrate      # or: ... migrate pytest -q
neon branches delete migration-test --project-id young-waterfall-75387175
```

Then repeat with `--branch production` for the real database. Application traffic (the API) uses the pooled string instead (`neon connection-string --pooled`).
