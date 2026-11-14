from fastapi import APIRouter, status

from app.api import schemas
from app.api.deps import DayRange, Db, PathUser, as_utc
from app.db import repository as repo
from app.db.models import JournalEntry

router = APIRouter(prefix="/users/{user_id}/journal", tags=["journal"])


@router.get("", response_model=list[schemas.JournalEntry])
def list_journal(user: PathUser, days: DayRange, db: Db):
    """Journal entries on UTC days [start, end], oldest first."""
    return repo.journal_entries(db, user.id, *days)


@router.post("", response_model=schemas.JournalEntry, status_code=status.HTTP_201_CREATED)
def record_journal_entry(user: PathUser, body: schemas.JournalEntryCreate, db: Db):
    """A free-text entry about how the user feels."""
    ts = as_utc(body.ts) if body.ts else None
    entry_id = repo.record_journal_entry(db, user.id, body.text, ts=ts, language=body.language)
    db.commit()
    return db.get(JournalEntry, entry_id)
