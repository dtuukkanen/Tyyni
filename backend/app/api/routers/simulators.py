"""Simulated data over HTTP, from app.simulators.combined: fill a user's signals for a
scenario, then detect anomalies and make suggestions, as the CLI does.

Meant for demos and testing a deployment; it is behind the same API key as everything else
and clears only simulated rows, never data from a device or the app.
"""

from datetime import timedelta

from fastapi import APIRouter

from app.api import schemas
from app.api.deps import Db, PathUser, today_utc
from app.inference import anomalies, suggestions
from app.simulators import combined

router = APIRouter(tags=["simulators"])


@router.get("/simulators", response_model=schemas.Simulators)
def list_scenarios():
    """The scenarios `POST /users/{user_id}/simulate` takes, and each signal's own."""
    return {
        "scenarios": combined.SCENARIOS,
        "signals": {s: list(m.SCENARIOS) for s, m in combined.MODULES.items()},
    }


@router.post("/users/{user_id}/simulate", response_model=schemas.Simulation)
def simulate(user: PathUser, body: schemas.SimulationCreate, db: Db):
    """Write `days` UTC days of simulated data ending on `end`, all signals telling the same
    story, then (with `infer`) detect the period's anomalies and make the last day's
    suggestions.

    A rerun replaces the earlier simulated rows, so rerun it on demo day to have data up to
    today. The returned seed reproduces the run.
    """
    end = body.end or today_utc()
    start = end - timedelta(days=body.days - 1)
    run = combined.simulate(
        db,
        user.id,
        start,
        body.days,
        body.scenario,
        signals=body.signals,
        overrides=body.scenarios,
        seed=body.seed,
        artifacts=body.artifacts,
        language=body.language,
        replace=body.replace,
    )
    found, made = [], []
    if body.infer:
        found = anomalies.detect(db, user.id, start, end)
        made = suggestions.suggest(db, user.id, end)
    db.commit()
    return {
        "user_id": user.id,
        "start": start,
        "end": end,
        "seed": run.seed,
        "scenarios": run.scenarios,
        "rows": run.rows,
        "anomalies": found,
        "suggestions": made,
    }
