"""SQLAlchemy models.

Storage choices (see README "Database"):
- heart_samples / activity_samples: TimescaleDB hypertables (high-frequency time series),
  rolled up per day on read by `repository.daily_metrics`.
- sleep_sessions: one row per night (an interval, not a stream), stages in JSONB.
- journal_entries: free-text feeling journal; expected_label / expected_risk are the
  simulator's ground truth (null for real entries).
- Everything else (mood, anomalies, suggestions, consent, alerts): plain relational tables.

The schema itself is owned by Alembic (alembic/versions); keep these models in sync.
"""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Computed,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

SEVERITIES = ("normal", "attention", "critical")
CONTACT_KINDS = ("friend", "clinician")
LANGUAGES = ("fi", "en")
LABELS = ("positive", "neutral", "harmful")  # journal entry tone
RISKS = ("none", "self_harm", "suicidal")  # crisis content in a journal entry


class Base(DeclarativeBase):
    pass


def _user_fk(index: bool = True) -> Mapped[uuid.UUID]:
    return mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=index
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    display_name: Mapped[str] = mapped_column(Text)
    timezone: Mapped[str] = mapped_column(Text, server_default="Europe/Helsinki")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# --- Time series (hypertables) -------------------------------------------------------


class HeartSample(Base):
    __tablename__ = "heart_samples"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    hr_bpm: Mapped[float | None] = mapped_column(Float)
    hrv_rmssd_ms: Mapped[float | None] = mapped_column(Float)
    source: Mapped[str] = mapped_column(Text, server_default="device")


class ActivitySample(Base):
    __tablename__ = "activity_samples"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    steps: Mapped[int] = mapped_column(Integer, server_default="0")
    active_minutes: Mapped[float] = mapped_column(Float, server_default="0")
    screen_time_min: Mapped[float] = mapped_column(Float, server_default="0")
    source: Mapped[str] = mapped_column(Text, server_default="device")


# --- Sessions / events ----------------------------------------------------------------


class SleepSession(Base):
    __tablename__ = "sleep_sessions"
    __table_args__ = (
        CheckConstraint("wake_time > bedtime", name="sleep_wake_after_bed"),
        Index("ix_sleep_sessions_user_wake", "user_id", "wake_time"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[uuid.UUID] = _user_fk(index=False)
    bedtime: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    wake_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    duration_min: Mapped[int] = mapped_column(
        Integer, Computed("(EXTRACT(EPOCH FROM (wake_time - bedtime)) / 60)::integer")
    )
    efficiency: Mapped[float | None] = mapped_column(Float)  # 0..1, time asleep / time in bed
    stages: Mapped[dict | None] = mapped_column(JSONB)  # e.g. {"deep": 80, "rem": 95, "light": 220}
    source: Mapped[str] = mapped_column(Text, server_default="device")


class MoodCheckin(Base):
    __tablename__ = "mood_checkins"
    __table_args__ = (
        CheckConstraint("score BETWEEN 1 AND 5", name="mood_score_range"),
        Index("ix_mood_checkins_user_ts", "user_id", "ts"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[uuid.UUID] = _user_fk(index=False)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    score: Mapped[int] = mapped_column(SmallInteger)
    note: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(Text, server_default="app")


class JournalEntry(Base):
    __tablename__ = "journal_entries"
    __table_args__ = (
        CheckConstraint(f"language IN {LANGUAGES}", name="journal_language"),
        CheckConstraint(f"expected_label IN {LABELS}", name="journal_expected_label"),
        CheckConstraint(f"expected_risk IN {RISKS}", name="journal_expected_risk"),
        Index("ix_journal_entries_user_ts", "user_id", "ts"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[uuid.UUID] = _user_fk(index=False)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    text: Mapped[str] = mapped_column(Text)
    language: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(Text, server_default="app")
    # Ground truth, set only by the journal simulator
    expected_label: Mapped[str | None] = mapped_column(Text)
    expected_risk: Mapped[str | None] = mapped_column(Text)


# --- Inference output, suggestions, escalation ---------------------------------------


class Anomaly(Base):
    __tablename__ = "anomalies"
    __table_args__ = (
        CheckConstraint(f"severity IN {SEVERITIES}", name="anomaly_severity"),
        Index("ix_anomalies_user_day", "user_id", "day"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[uuid.UUID] = _user_fk(index=False)
    day: Mapped[date] = mapped_column(Date)
    kind: Mapped[str] = mapped_column(Text)  # e.g. "stress", "sleep_shift", "screen_time"
    severity: Mapped[str] = mapped_column(Text)
    metric: Mapped[str | None] = mapped_column(Text)
    value: Mapped[float | None] = mapped_column(Float)
    baseline: Mapped[float | None] = mapped_column(Float)
    explanation: Mapped[dict | None] = mapped_column(JSONB)  # why it fired
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Suggestion(Base):
    __tablename__ = "suggestions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[uuid.UUID] = _user_fk()
    anomaly_id: Mapped[int | None] = mapped_column(ForeignKey("anomalies.id", ondelete="SET NULL"))
    kind: Mapped[str] = mapped_column(Text)  # e.g. "walk", "breathing", "music", "message_friend"
    shown_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SuggestionFeedback(Base):
    __tablename__ = "suggestion_feedback"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    suggestion_id: Mapped[int] = mapped_column(
        ForeignKey("suggestions.id", ondelete="CASCADE"), index=True
    )
    done: Mapped[bool] = mapped_column(Boolean)
    helped: Mapped[bool | None] = mapped_column(Boolean)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Contact(Base):
    __tablename__ = "contacts"
    __table_args__ = (CheckConstraint(f"kind IN {CONTACT_KINDS}", name="contact_kind"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[uuid.UUID] = _user_fk()
    kind: Mapped[str] = mapped_column(Text)
    name: Mapped[str] = mapped_column(Text)
    channel: Mapped[str | None] = mapped_column(Text)  # e.g. "sms:+358...", "mock"


class Consent(Base):
    __tablename__ = "consents"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[uuid.UUID] = _user_fk()
    contact_id: Mapped[int] = mapped_column(ForeignKey("contacts.id", ondelete="CASCADE"))
    scope: Mapped[dict] = mapped_column(JSONB)  # what may be shared, e.g. {"reason": true}
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Alert(Base):
    """An escalation sent to a contact. Holds the reason only, never raw sensor data."""

    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[uuid.UUID] = _user_fk()
    contact_id: Mapped[int] = mapped_column(ForeignKey("contacts.id", ondelete="CASCADE"))
    anomaly_id: Mapped[int | None] = mapped_column(ForeignKey("anomalies.id", ondelete="SET NULL"))
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, server_default="pending")
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
