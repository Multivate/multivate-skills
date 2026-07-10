"""Mentor profile approval workflow.

Revision ID: 004_mentor_approval
Revises: 003_mentors_guidance
Create Date: 2026-07-07
"""

from alembic import op

revision = "004_mentor_approval"
down_revision = "003_mentors_guidance"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS approval_status VARCHAR(16) NOT NULL DEFAULT 'draft'")
    op.execute("ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT")
    op.execute("ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ")
    op.execute("ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ")
    op.execute("ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS german_level VARCHAR(32)")
    op.execute("ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS field_of_work VARCHAR(128)")
    op.execute("DELETE FROM mentor_profiles WHERE user_id IS NULL")
    op.execute("CREATE INDEX IF NOT EXISTS ix_mentor_profiles_approval ON mentor_profiles (approval_status)")


def downgrade() -> None:
    op.execute("ALTER TABLE mentor_profiles DROP COLUMN IF EXISTS field_of_work")
    op.execute("ALTER TABLE mentor_profiles DROP COLUMN IF EXISTS german_level")
    op.execute("ALTER TABLE mentor_profiles DROP COLUMN IF EXISTS approved_at")
    op.execute("ALTER TABLE mentor_profiles DROP COLUMN IF EXISTS submitted_at")
    op.execute("ALTER TABLE mentor_profiles DROP COLUMN IF EXISTS rejection_reason")
    op.execute("ALTER TABLE mentor_profiles DROP COLUMN IF EXISTS approval_status")