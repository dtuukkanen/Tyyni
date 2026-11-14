"""Give suggestions the day they are for and the reason they were made.

`day` lets suggestions be made for a past day (simulated history) and listed by day, which
`shown_at` (the insert time) cannot. `reason` keeps the anomaly's summary, so a suggestion
still says why it was made after re-detection removes its anomaly (anomaly_id becomes null).

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-14
"""

from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE suggestions ADD COLUMN day date, ADD COLUMN reason text;
        UPDATE suggestions SET day = (shown_at AT TIME ZONE 'UTC')::date;
        ALTER TABLE suggestions ALTER COLUMN day SET NOT NULL;
        DROP INDEX ix_suggestions_user_id;
        CREATE INDEX ix_suggestions_user_day ON suggestions (user_id, day);
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP INDEX ix_suggestions_user_day;
        CREATE INDEX ix_suggestions_user_id ON suggestions (user_id);
        ALTER TABLE suggestions DROP COLUMN day, DROP COLUMN reason;
        """
    )
