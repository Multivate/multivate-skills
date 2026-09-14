"""Add audio phrasebook progress and module assessment tables.

Revision ID: a7f3c91e2b04
Revises: 08601a4c2518
Create Date: 2026-09-14
"""

from alembic import op

revision = "a7f3c91e2b04"
down_revision = "08601a4c2518"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS audio_phrase_progress (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            phrase_id UUID NOT NULL REFERENCES audio_phrases(id) ON DELETE CASCADE,
            learned BOOLEAN NOT NULL DEFAULT TRUE,
            learned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_audio_phrase_progress_user_phrase UNIQUE (user_id, phrase_id)
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_audio_phrase_progress_user_id ON audio_phrase_progress (user_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_audio_phrase_progress_phrase_id ON audio_phrase_progress (phrase_id)"
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS audio_module_assessments (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
            module_key VARCHAR(64) NOT NULL,
            score_pct INTEGER NOT NULL DEFAULT 0,
            passed BOOLEAN NOT NULL DEFAULT FALSE,
            attempt_count INTEGER NOT NULL DEFAULT 1,
            attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_audio_module_assessment_user_course_module
                UNIQUE (user_id, course_id, module_key)
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_audio_module_assessments_user_id ON audio_module_assessments (user_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_audio_module_assessments_course_id ON audio_module_assessments (course_id)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS audio_module_assessments")
    op.execute("DROP TABLE IF EXISTS audio_phrase_progress")
