"""HTTP interface for the frontend. Run: uvicorn app.api.main:app --reload

Interactive docs at /docs; the OpenAPI schema at /openapi.json can generate a typed client.
"""

import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.deps import Db, require_api_key
from app.api.routers import (
    anomalies,
    journal,
    metrics,
    mood,
    samples,
    simulators,
    suggestions,
    users,
)

DEFAULT_CORS_ORIGINS = "http://localhost:5173,http://localhost:3000"

app = FastAPI(
    title="Wellbeing API",
    version="0.1.0",
    description="Users, daily metrics, raw sensor series, mood check-ins, journal entries, "
    "anomalies, suggestions with their feedback, and simulated test data. "
    "All days are UTC calendar days; a sleep session counts toward the day the user woke up. "
    "When the server sets API_KEY, every route requires it in the X-API-Key header.",
    dependencies=[Depends(require_api_key)],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        o.strip() for o in os.environ.get("CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",") if o
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (
    users.router,
    metrics.router,
    samples.router,
    mood.router,
    journal.router,
    anomalies.router,
    suggestions.router,
    simulators.router,
):
    app.include_router(router)


@app.get("/health", tags=["meta"])
def health(db: Db) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"status": "ok"}
