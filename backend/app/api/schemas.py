"""Request and response bodies. Days are UTC calendar days, as in the repository."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class _FromOrm(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)
    timezone: str = "Europe/Helsinki"


class User(_FromOrm):
    id: uuid.UUID
    display_name: str
    timezone: str
    created_at: datetime


class Metrics(BaseModel):
    """The daily metrics from repository.METRICS; None where there is no data."""

    hr_avg: float | None = None
    hr_min: float | None = None
    hrv_rmssd_avg: float | None = None
    steps: float | None = Field(None, description="Daily total (a mean in a baseline)")
    active_minutes: float | None = None
    screen_time_min: float | None = None
    sleep_duration_min: float | None = Field(
        None, description="Time in bed for the night that ended this day"
    )
    bedtime_hour: float | None = Field(
        None,
        description="Hours since midnight of the day before waking (23:30 -> 23.5, 01:00 -> 25)",
    )
    wake_hour: float | None = None
    mood_avg: float | None = None


class DailyMetrics(Metrics):
    day: date
    steps: int | None = None


class Baseline(Metrics):
    day: date = Field(description="The day the baseline is for (not included in it)")
    window: int = Field(description="Number of days before `day` that were averaged")


class Today(BaseModel):
    day: date
    metrics: DailyMetrics
    baseline: Baseline
    mood_logged: bool


class HeartSample(_FromOrm):
    ts: datetime
    hr_bpm: float | None
    hrv_rmssd_ms: float | None
    source: str


class ActivitySample(_FromOrm):
    ts: datetime
    steps: int
    active_minutes: float
    screen_time_min: float
    source: str


class SleepSession(_FromOrm):
    id: int
    bedtime: datetime
    wake_time: datetime
    duration_min: int
    efficiency: float | None
    stages: dict[str, float] | None
    source: str


class MoodCreate(BaseModel):
    score: int = Field(ge=1, le=5)
    note: str | None = Field(None, max_length=1000)
    ts: datetime | None = Field(None, description="Defaults to now; naive times are UTC")


class Mood(_FromOrm):
    id: int
    ts: datetime
    score: int
    note: str | None
