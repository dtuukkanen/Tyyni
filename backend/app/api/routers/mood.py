from fastapi import APIRouter, status

from app.api import schemas
from app.api.deps import DayRange, Db, PathUser, as_utc
from app.db import repository as repo
from app.db.models import MoodCheckin

router = APIRouter(prefix="/users/{user_id}/mood", tags=["mood"])


@router.get("", response_model=list[schemas.Mood])
def list_mood(user: PathUser, days: DayRange, db: Db):
    """Mood check-ins on UTC days [start, end], oldest first."""
    return repo.mood_checkins(db, user.id, *days)


@router.post("", response_model=schemas.Mood, status_code=status.HTTP_201_CREATED)
def record_mood(user: PathUser, body: schemas.MoodCreate, db: Db):
    """The daily 1-tap check-in: score 1 (bad) to 5 (good)."""
    ts = as_utc(body.ts) if body.ts else None
    mood_id = repo.record_mood(db, user.id, body.score, ts=ts, note=body.note)
    db.commit()
    return db.get(MoodCheckin, mood_id)
