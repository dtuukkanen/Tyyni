"""Suggestions from app.inference.suggestions: make the day's ones, list them, and record
whether the user did them and whether they helped."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api import schemas
from app.api.deps import DayRange, Db, PathUser, today_utc
from app.db import repository as repo
from app.inference import suggestions

router = APIRouter(prefix="/users/{user_id}/suggestions", tags=["suggestions"])


@router.get("", response_model=list[schemas.Suggestion])
def list_suggestions(user: PathUser, days: DayRange, db: Db):
    """Stored suggestions for UTC days [start, end], by day, with their latest feedback."""
    return [suggestions.present(s) for s in repo.suggestions(db, user.id, *days)]


@router.post("", response_model=list[schemas.Suggestion])
def make_suggestions(
    user: PathUser,
    db: Db,
    day: Annotated[date | None, Query(description="UTC day (default: today)")] = None,
):
    """Detect the anomalies of the day and the day before, add suggestions for them and
    return all of the day's suggestions.

    At most 3 a day, critical anomalies first. Calling it again only adds suggestions for
    new anomalies, so the ones already shown stay as they are.
    """
    made = suggestions.suggest(db, user.id, day or today_utc())
    db.commit()
    return made


@router.post(
    "/{suggestion_id}/feedback",
    response_model=schemas.Suggestion,
    status_code=status.HTTP_201_CREATED,
)
def record_feedback(
    user: PathUser, suggestion_id: int, body: schemas.SuggestionFeedbackCreate, db: Db
):
    """Whether the user did the suggestion and whether it helped. The latest answer counts,
    and later suggestions favour the practices that helped this user."""
    s = repo.get_suggestion(db, user.id, suggestion_id)
    if s is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "suggestion not found")
    repo.add_suggestion_feedback(db, s.id, done=body.done, helped=body.helped)
    db.commit()
    (row,) = (r for r in repo.suggestions(db, user.id, s.day, s.day) if r["id"] == s.id)
    return suggestions.present(row)
