"""Request and response bodies. Days are UTC calendar days, as in the repository."""

import uuid
from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.api.deps import MAX_SIMULATE_DAYS
from app.simulators import combined


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


Severity = Literal["normal", "attention", "critical"]


class Anomaly(_FromOrm):
    id: int
    day: date
    kind: str = Field(
        description="stress, short_sleep, long_sleep, sleep_shift, low_activity, screen_time "
        "or low_mood"
    )
    severity: Severity
    metric: str | None = Field(description="The most deviating metric")
    value: float | None
    baseline: float | None = Field(
        description="The metric's median over the 14 days before (for low_mood the mean of the "
        "usual check-ins); null for a very low mood without a usual one"
    )
    explanation: dict[str, Any] | None = Field(
        description="summary (text), signals (every metric that fired) and escalation "
        "(why it is critical: extreme, very_low, sustained, multiple_signals)"
    )
    created_at: datetime


class Suggestion(BaseModel):
    id: int
    day: date = Field(description="The day it was suggested for")
    kind: str = Field(description="The practice, a key of the catalog (e.g. box_breathing)")
    title: str
    text: str
    minutes: int = Field(description="About how long it takes")
    category: str = Field(
        description="breathing, movement, rest, grounding, sleep, screen, reflection, social "
        "or support"
    )
    anomaly_id: int | None = Field(description="The anomaly it answers; null once it is gone")
    anomaly_kind: str | None
    severity: Severity | None
    reason: str | None = Field(description="The anomaly's summary when it was suggested")
    shown_at: datetime
    done: bool | None = Field(description="Latest feedback: did the user do it")
    helped: bool | None = Field(description="Latest feedback: did it help")
    feedback_at: datetime | None


class SuggestionFeedbackCreate(BaseModel):
    done: bool
    helped: bool | None = Field(None, description="Only when done; null if not answered")

    @model_validator(mode="after")
    def _helped_needs_done(self) -> "SuggestionFeedbackCreate":
        if self.helped is not None and not self.done:
            raise ValueError("helped needs done=true")
        return self


class Today(BaseModel):
    day: date
    metrics: DailyMetrics
    baseline: Baseline
    mood_logged: bool
    anomalies: list[Anomaly] = Field(
        description="Stored anomalies for yesterday and today (run detect to refresh them)"
    )
    suggestions: list[Suggestion] = Field(
        description="Today's stored suggestions (POST /suggestions makes them)"
    )


class HeartSample(_FromOrm):
    ts: datetime
    hr_bpm: float | None
    hrv_rmssd_ms: float | None
    source: str


class ActivitySample(_FromOrm):
    ts: datetime
    steps: int
    active_minutes: float
    source: str


class ScreenSample(_FromOrm):
    ts: datetime
    screen_time_min: float = Field(description="Minutes the screen was on in the interval")
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
    source: str


Language = Literal["fi", "en"]
Label = Literal["positive", "neutral", "harmful"]
Risk = Literal["none", "self_harm", "suicidal"]


class JournalEntryCreate(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    language: Language | None = Field(None, description="Leave out if unknown")
    ts: datetime | None = Field(None, description="Defaults to now; naive times are UTC")


class JournalEntry(_FromOrm):
    id: int
    ts: datetime
    text: str
    language: Language | None
    source: str
    expected_label: Label | None = Field(
        description="Ground truth for simulated entries; null for real ones"
    )
    expected_risk: Risk | None = Field(
        description="Ground truth for simulated entries; null for real ones"
    )


Signal = Literal["sleep", "heart", "activity", "screen", "mood", "journal"]


class Simulators(BaseModel):
    scenarios: list[str] = Field(description="Every name `scenario` takes")
    signals: dict[Signal, list[str]] = Field(description="Each signal's own scenarios")


class SimulationCreate(BaseModel):
    scenario: str = Field(
        "stable_average",
        description="The story, e.g. stress_period. Each signal follows the same name, its "
        "closest match, or its steady default; see GET /simulators",
    )
    days: int = Field(21, ge=1, le=MAX_SIMULATE_DAYS)
    end: date | None = Field(None, description="Last UTC day (default: today)")
    seed: int | None = Field(
        None, ge=0, lt=2**32, description="Same seed, same data (default: a random one)"
    )
    signals: list[Signal] = Field(
        default_factory=lambda: list(combined.SIGNALS),
        min_length=1,
        description="Which signals to write (default: all)",
    )
    scenarios: dict[Signal, str] = Field(
        default_factory=dict, description="Set one signal's scenario directly"
    )
    artifacts: bool = Field(False, description="Add real-world mess: gaps, a watch left off")
    language: Literal["fi", "en", "mixed"] = Field("mixed", description="Journal language")
    replace: bool = Field(
        True, description="First clear the user's earlier simulated rows of each signal"
    )
    infer: bool = Field(
        True,
        description="Then detect the period's anomalies and make the last day's suggestions",
    )

    @model_validator(mode="after")
    def _known_scenarios(self) -> "SimulationCreate":
        combined.scenarios_for(self.scenario, self.scenarios)
        return self


class Simulation(BaseModel):
    user_id: uuid.UUID
    start: date
    end: date
    seed: int = Field(description="Send it back to get the same data")
    scenarios: dict[Signal, str] = Field(description="The scenario each signal followed")
    rows: dict[Signal, int] = Field(description="Rows written per signal")
    anomalies: list[Anomaly] = Field(description="Detected in the period (when infer)")
    suggestions: list[Suggestion] = Field(description="The last day's (when infer)")
