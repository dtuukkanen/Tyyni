"""Anomalies from app.inference.anomalies: read the stored ones, or detect them again."""

from fastapi import APIRouter

from app.api import schemas
from app.api.deps import DayRange, Db, PathUser
from app.db import repository as repo
from app.inference import anomalies

router = APIRouter(prefix="/users/{user_id}/anomalies", tags=["anomalies"])


@router.get("", response_model=list[schemas.Anomaly])
def list_anomalies(user: PathUser, days: DayRange, db: Db):
    """Stored anomalies on UTC days [start, end], by day."""
    return repo.anomalies(db, user.id, *days)


@router.post("/detect", response_model=list[schemas.Anomaly])
def detect(user: PathUser, days: DayRange, db: Db):
    """Detect the anomalies on UTC days [start, end] again from the current data and store them.

    An anomaly that still fires keeps its id; one that no longer fires is removed. Heart and
    activity are not judged for today, whose data is still coming in.
    """
    found = anomalies.detect(db, user.id, *days)
    db.commit()
    return found
