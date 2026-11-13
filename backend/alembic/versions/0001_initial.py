"""Initial schema: TimescaleDB hypertables for HR/HRV and activity, relational tables for the rest.

Revision ID: 0001
Revises:
Create Date: 2026-11-13
"""

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


TABLES = """
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE users (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name text NOT NULL,
    timezone     text NOT NULL DEFAULT 'Europe/Helsinki',
    created_at   timestamptz NOT NULL DEFAULT now()
);

-- High-frequency streams -> hypertables -------------------------------------------
CREATE TABLE heart_samples (
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ts           timestamptz NOT NULL,
    hr_bpm       double precision,
    hrv_rmssd_ms double precision,
    source       text NOT NULL DEFAULT 'device',
    PRIMARY KEY (user_id, ts)
);
SELECT create_hypertable('heart_samples', by_range('ts', INTERVAL '7 days'));

CREATE TABLE activity_samples (
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ts              timestamptz NOT NULL,
    steps           integer NOT NULL DEFAULT 0,
    active_minutes  double precision NOT NULL DEFAULT 0,
    screen_time_min double precision NOT NULL DEFAULT 0,
    source          text NOT NULL DEFAULT 'device',
    PRIMARY KEY (user_id, ts)
);
SELECT create_hypertable('activity_samples', by_range('ts', INTERVAL '7 days'));

-- Sessions / events ----------------------------------------------------------------
CREATE TABLE sleep_sessions (
    id           bigserial PRIMARY KEY,
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bedtime      timestamptz NOT NULL,
    wake_time    timestamptz NOT NULL,
    duration_min integer GENERATED ALWAYS AS
                 ((EXTRACT(EPOCH FROM (wake_time - bedtime)) / 60)::integer) STORED,
    efficiency   double precision,
    stages       jsonb,
    source       text NOT NULL DEFAULT 'device',
    CONSTRAINT sleep_wake_after_bed CHECK (wake_time > bedtime)
);
CREATE INDEX ix_sleep_sessions_user_wake ON sleep_sessions (user_id, wake_time);

CREATE TABLE mood_checkins (
    id      bigserial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ts      timestamptz NOT NULL DEFAULT now(),
    score   smallint NOT NULL,
    note    text,
    CONSTRAINT mood_score_range CHECK (score BETWEEN 1 AND 5)
);
CREATE INDEX ix_mood_checkins_user_ts ON mood_checkins (user_id, ts);

-- Inference output -----------------------------------------------------------------
CREATE TABLE anomalies (
    id          bigserial PRIMARY KEY,
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day         date NOT NULL,
    kind        text NOT NULL,
    severity    text NOT NULL,
    metric      text,
    value       double precision,
    baseline    double precision,
    explanation jsonb,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT anomaly_severity CHECK (severity IN ('normal', 'attention', 'critical'))
);
CREATE INDEX ix_anomalies_user_day ON anomalies (user_id, day);

-- Suggestions + feedback -----------------------------------------------------------
CREATE TABLE suggestions (
    id         bigserial PRIMARY KEY,
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    anomaly_id bigint REFERENCES anomalies(id) ON DELETE SET NULL,
    kind       text NOT NULL,
    shown_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_suggestions_user_id ON suggestions (user_id);

CREATE TABLE suggestion_feedback (
    id            bigserial PRIMARY KEY,
    suggestion_id bigint NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
    done          boolean NOT NULL,
    helped        boolean,
    ts            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_suggestion_feedback_suggestion_id ON suggestion_feedback (suggestion_id);

-- Escalation: contacts, consent, alerts --------------------------------------------
CREATE TABLE contacts (
    id      bigserial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind    text NOT NULL,
    name    text NOT NULL,
    channel text,
    CONSTRAINT contact_kind CHECK (kind IN ('friend', 'clinician'))
);
CREATE INDEX ix_contacts_user_id ON contacts (user_id);

CREATE TABLE consents (
    id         bigserial PRIMARY KEY,
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id bigint NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    scope      jsonb NOT NULL,
    granted_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz
);
CREATE INDEX ix_consents_user_id ON consents (user_id);

CREATE TABLE alerts (
    id         bigserial PRIMARY KEY,
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id bigint NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    anomaly_id bigint REFERENCES anomalies(id) ON DELETE SET NULL,
    reason     text NOT NULL,
    status     text NOT NULL DEFAULT 'pending',
    sent_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_alerts_user_id ON alerts (user_id);
"""

# Continuous aggregates must be created outside a transaction block.
# materialized_only = false -> real-time aggregation, so freshly simulated data shows up
# immediately instead of waiting for the refresh policy.
CAGGS = [
    """
    CREATE MATERIALIZED VIEW heart_daily
    WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
    SELECT user_id,
           time_bucket(INTERVAL '1 day', ts) AS day,
           AVG(hr_bpm)       AS hr_avg,
           MIN(hr_bpm)       AS hr_min,
           AVG(hrv_rmssd_ms) AS hrv_rmssd_avg,
           COUNT(*)          AS n_samples
    FROM heart_samples
    GROUP BY user_id, day
    WITH NO DATA
    """,
    """
    CREATE MATERIALIZED VIEW activity_daily
    WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
    SELECT user_id,
           time_bucket(INTERVAL '1 day', ts) AS day,
           SUM(steps)::bigint            AS steps,
           SUM(active_minutes)           AS active_minutes,
           SUM(screen_time_min)          AS screen_time_min
    FROM activity_samples
    GROUP BY user_id, day
    WITH NO DATA
    """,
    """
    SELECT add_continuous_aggregate_policy('heart_daily',
        start_offset => INTERVAL '60 days', end_offset => INTERVAL '1 hour',
        schedule_interval => INTERVAL '15 minutes')
    """,
    """
    SELECT add_continuous_aggregate_policy('activity_daily',
        start_offset => INTERVAL '60 days', end_offset => INTERVAL '1 hour',
        schedule_interval => INTERVAL '15 minutes')
    """,
]


def upgrade() -> None:
    op.execute(TABLES)
    with op.get_context().autocommit_block():
        for stmt in CAGGS:
            op.execute(stmt)


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("DROP MATERIALIZED VIEW IF EXISTS activity_daily CASCADE")
        op.execute("DROP MATERIALIZED VIEW IF EXISTS heart_daily CASCADE")
    # Timescale refuses to drop a hypertable together with other tables in one statement.
    op.execute("DROP TABLE IF EXISTS activity_samples CASCADE")
    op.execute("DROP TABLE IF EXISTS heart_samples CASCADE")
    op.execute(
        """
        DROP TABLE IF EXISTS alerts, consents, contacts, suggestion_feedback, suggestions,
            anomalies, mood_checkins, sleep_sessions, users CASCADE
        """
    )
