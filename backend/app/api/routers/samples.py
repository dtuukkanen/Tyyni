"""Raw sensor series, for charts that need more than the daily rollup."""

from fastapi import APIRouter

from app.api import schemas
from app.api.deps import DayRange, Db, PathUser, TimeRange
from app.db import repository as repo

router = APIRouter(prefix="/users/{user_id}", tags=["samples"])


@router.get("/heart", response_model=list[schemas.HeartSample])
def heart(user: PathUser, span: TimeRange, db: Db):
    """Heart rate and HRV samples with start <= ts < end (at most 31 days)."""
    return repo.heart_samples(db, user.id, *span)


@router.get("/activity", response_model=list[schemas.ActivitySample])
def activity(user: PathUser, span: TimeRange, db: Db):
    """Step / activity samples with start <= ts < end (at most 31 days)."""
    return repo.activity_samples(db, user.id, *span)


@router.get("/sleep", response_model=list[schemas.SleepSession])
def sleep(user: PathUser, days: DayRange, db: Db):
    """Sleep sessions whose UTC wake day is in [start, end]."""
    return repo.sleep_sessions(db, user.id, *days)
