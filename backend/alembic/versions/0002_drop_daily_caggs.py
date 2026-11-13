"""Drop the heart_daily / activity_daily continuous aggregates.

Real-time aggregation only reads raw rows newer than the aggregate's watermark. Rows written
into an already-materialized range (simulators backfill past days and replace scenarios) stay
invisible or stale until the next policy refresh, and forever once older than the 60-day policy
window. Daily values are now computed from the hypertables in `repository.daily_metrics`.

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-13
"""

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Dropping a continuous aggregate also removes its refresh policy job.
    with op.get_context().autocommit_block():
        op.execute("DROP MATERIALIZED VIEW IF EXISTS activity_daily")
        op.execute("DROP MATERIALIZED VIEW IF EXISTS heart_daily")


# Same definitions as 0001 (migrations are frozen, so they are copied rather than imported).
_RESTORE = [
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


def downgrade() -> None:
    with op.get_context().autocommit_block():
        for stmt in _RESTORE:
            op.execute(stmt)
