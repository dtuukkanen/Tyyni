"""Add journal_entries: free-text feeling journal, with ground truth for simulated entries.

expected_label / expected_risk are set only by the journal simulator (the truth a classifier
is evaluated against); they stay null for real entries.

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-14
"""

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE journal_entries (
            id             bigserial PRIMARY KEY,
            user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            ts             timestamptz NOT NULL DEFAULT now(),
            text           text NOT NULL,
            language       text,
            source         text NOT NULL DEFAULT 'app',
            expected_label text,
            expected_risk  text,
            CONSTRAINT journal_language CHECK (language IN ('fi', 'en')),
            CONSTRAINT journal_expected_label
                CHECK (expected_label IN ('positive', 'neutral', 'harmful')),
            CONSTRAINT journal_expected_risk
                CHECK (expected_risk IN ('none', 'self_harm', 'suicidal'))
        );
        CREATE INDEX ix_journal_entries_user_ts ON journal_entries (user_id, ts);
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS journal_entries")
