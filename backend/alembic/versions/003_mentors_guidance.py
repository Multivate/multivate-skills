"""Mentor profiles, guest conversations, and guidance chat tables.

Revision ID: 003_mentors_guidance
Revises: 002_discount_codes
Create Date: 2026-07-07
"""

from alembic import op

revision = "003_mentors_guidance"
down_revision = "002_discount_codes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS mentor_profiles (
            id UUID PRIMARY KEY,
            slug VARCHAR(128) NOT NULL UNIQUE,
            full_name VARCHAR(255) NOT NULL,
            headline VARCHAR(255) NOT NULL DEFAULT '',
            bio TEXT NOT NULL DEFAULT '',
            photo_url VARCHAR(512),
            city VARCHAR(128) NOT NULL DEFAULT '',
            origin_country VARCHAR(128),
            years_in_germany INTEGER,
            expertise_areas TEXT NOT NULL DEFAULT '',
            languages_spoken VARCHAR(512) NOT NULL DEFAULT '',
            career_tips TEXT,
            is_featured BOOLEAN NOT NULL DEFAULT FALSE,
            is_published BOOLEAN NOT NULL DEFAULT TRUE,
            sort_order INTEGER NOT NULL DEFAULT 0,
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_mentor_profiles_slug ON mentor_profiles (slug)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_mentor_profiles_user_id ON mentor_profiles (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_mentor_profiles_published ON mentor_profiles (is_published)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS mentor_conversations (
            id UUID PRIMARY KEY,
            mentor_id UUID NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
            visitor_name VARCHAR(255) NOT NULL,
            visitor_email VARCHAR(320),
            guest_token VARCHAR(64) NOT NULL UNIQUE,
            visitor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            status VARCHAR(16) NOT NULL DEFAULT 'open',
            last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_mentor_conversations_mentor_id ON mentor_conversations (mentor_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_mentor_conversations_guest_token ON mentor_conversations (guest_token)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS mentor_messages (
            id UUID PRIMARY KEY,
            conversation_id UUID NOT NULL REFERENCES mentor_conversations(id) ON DELETE CASCADE,
            sender_kind VARCHAR(16) NOT NULL,
            sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            body TEXT NOT NULL,
            read_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_mentor_messages_conversation_id ON mentor_messages (conversation_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS mentor_messages")
    op.execute("DROP TABLE IF EXISTS mentor_conversations")
    op.execute("DROP TABLE IF EXISTS mentor_profiles")
