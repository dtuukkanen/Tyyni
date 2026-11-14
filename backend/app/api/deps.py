"""Shared FastAPI dependencies: API key, DB session, path user, and validated query ranges."""

import os
import secrets
import uuid
from collections.abc import Iterator
from datetime import UTC, date, datetime, timedelta
from typing import Annotated

from fastapi import Depends, HTTPException, Query, Security, status
from fastapi.security import APIKeyHeader
from sqlalchemy.orm import Session

from app.db import get_session
from app.db import repository as repo
from app.db.models import User

DEFAULT_DAYS = 14
MAX_DAYS = 366
MAX_SAMPLE_DAYS = 31


_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def require_api_key(key: Annotated[str | None, Security(_api_key_header)]) -> None:
    """Shared secret between the frontend's server and this API, checked when API_KEY is set.

    Unset (local development, tests) leaves the API open. It is not per-user auth: whoever holds
    the key can read every user's data, so it must stay on the server side.
    """
    expected = os.environ.get("API_KEY")
    if expected and not (key and secrets.compare_digest(key, expected)):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid or missing API key")


def get_db() -> Iterator[Session]:
    """One session per request; commits on success, rolls back on error.

    Routes that write still call `db.commit()` themselves, so a failed commit becomes an
    error response instead of happening after a 201 was sent.
    """
    with get_session() as session:
        yield session


Db = Annotated[Session, Depends(get_db)]


def get_user_or_404(user_id: uuid.UUID, db: Db) -> User:
    user = repo.get_user(db, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "user not found")
    return user


PathUser = Annotated[User, Depends(get_user_or_404)]


def today_utc() -> date:
    return datetime.now(UTC).date()


def as_utc(ts: datetime) -> datetime:
    """Treat naive datetimes as UTC."""
    return ts if ts.tzinfo is not None else ts.replace(tzinfo=UTC)


def _invalid(detail: str) -> HTTPException:
    return HTTPException(422, detail)


def day_range(
    start: Annotated[
        date | None, Query(description=f"First UTC day (default: end - {DEFAULT_DAYS - 1})")
    ] = None,
    end: Annotated[
        date | None, Query(description="Last UTC day, inclusive (default: today)")
    ] = None,
) -> tuple[date, date]:
    end = end or today_utc()
    start = start or end - timedelta(days=DEFAULT_DAYS - 1)
    if start > end:
        raise _invalid("start must be on or before end")
    if (end - start).days + 1 > MAX_DAYS:
        raise _invalid(f"range is limited to {MAX_DAYS} days")
    return start, end


DayRange = Annotated[tuple[date, date], Depends(day_range)]


def time_range(
    start: Annotated[
        datetime | None, Query(description="Inclusive; naive times are UTC (default: end - 24 h)")
    ] = None,
    end: Annotated[
        datetime | None, Query(description="Exclusive; naive times are UTC (default: now)")
    ] = None,
) -> tuple[datetime, datetime]:
    end = as_utc(end) if end else datetime.now(UTC)
    start = as_utc(start) if start else end - timedelta(days=1)
    if start >= end:
        raise _invalid("start must be before end")
    if end - start > timedelta(days=MAX_SAMPLE_DAYS):
        raise _invalid(f"range is limited to {MAX_SAMPLE_DAYS} days")
    return start, end


TimeRange = Annotated[tuple[datetime, datetime], Depends(time_range)]
