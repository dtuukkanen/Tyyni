"""Daily rollups and baselines, straight from repository.daily_metrics / rolling_baseline."""

from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Query

from app.api import schemas
from app.api.deps import DEFAULT_DAYS, DayRange, Db, PathUser, today_utc
from app.db import repository as repo

router = APIRouter(prefix="/users/{user_id}", tags=["metrics"])


@router.get("/daily", response_model=list[schemas.DailyMetrics])
def daily(user: PathUser, days: DayRange, db: Db):
    """One row per UTC day in [start, end]; metrics without data are null."""
    start, end = days
    return repo.daily_metrics(db, user.id, start, end)


@router.get("/baseline", response_model=schemas.Baseline)
def baseline(
    user: PathUser,
    db: Db,
    day: Annotated[date | None, Query(description="Default: today (UTC)")] = None,
    window: Annotated[int, Query(ge=1, le=90)] = DEFAULT_DAYS,
):
    """Mean of each metric over the `window` days before `day` (not including it)."""
    day = day or today_utc()
    return {"day": day, "window": window, **repo.rolling_baseline(db, user.id, day, window)}


@router.get("/today", response_model=schemas.Today)
def today(user: PathUser, db: Db):
    """Everything the day view needs: today's metrics, the usual level, the mood state and
    the stored anomalies of yesterday and today (heart and activity are judged once a day is
    over, so yesterday's are the latest)."""
    day = today_utc()
    (metrics,) = repo.daily_metrics(db, user.id, day, day)
    base = repo.rolling_baseline(db, user.id, day, DEFAULT_DAYS)
    return {
        "day": day,
        "metrics": metrics,
        "baseline": {"day": day, "window": DEFAULT_DAYS, **base},
        "mood_logged": metrics["mood_avg"] is not None,
        "anomalies": repo.anomalies(db, user.id, day - timedelta(days=1), day),
    }
