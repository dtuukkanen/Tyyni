"""Move screen time out of activity_samples into its own screen_samples hypertable.

Screen time comes from the phone's screen-time API, steps from the wearable: two sources with
their own timestamps. Sharing (user_id, ts) rows meant one signal overwrote the other's row
and clearing one source (e.g. a simulator rerun) deleted the other's data too.

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-14
"""

from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE screen_samples (
            user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            ts              timestamptz NOT NULL,
            screen_time_min double precision NOT NULL DEFAULT 0,
            source          text NOT NULL DEFAULT 'device',
            PRIMARY KEY (user_id, ts)
        );
        SELECT create_hypertable('screen_samples', by_range('ts', INTERVAL '7 days'));

        INSERT INTO screen_samples (user_id, ts, screen_time_min, source)
        SELECT user_id, ts, screen_time_min, source FROM activity_samples
        WHERE screen_time_min > 0;

        ALTER TABLE activity_samples DROP COLUMN screen_time_min;
        """
    )


def downgrade() -> None:
    # Screen samples without an activity sample at the same ts are lost.
    op.execute(
        """
        ALTER TABLE activity_samples
            ADD COLUMN screen_time_min double precision NOT NULL DEFAULT 0;

        UPDATE activity_samples a SET screen_time_min = s.screen_time_min
        FROM screen_samples s WHERE s.user_id = a.user_id AND s.ts = a.ts;

        DROP TABLE screen_samples;
        """
    )
