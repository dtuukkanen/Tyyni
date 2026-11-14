"""Add mood_checkins.source, so simulated check-ins can be told apart and cleared.

Existing and app-written check-ins are 'app'; the mood simulator writes
'simulator:mood:<scenario>'.

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-14
"""

from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE mood_checkins ADD COLUMN source text NOT NULL DEFAULT 'app'")


def downgrade() -> None:
    op.execute("ALTER TABLE mood_checkins DROP COLUMN source")
