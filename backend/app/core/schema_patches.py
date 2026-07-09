"""Idempotent Postgres patches for databases created before newer columns/tables existed."""

from __future__ import annotations

import logging

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from app.core.database import Base

logger = logging.getLogger(__name__)


def _db_tail(database_url: str) -> str:
    if "@" in database_url:
        return database_url.split("@", 1)[-1]
    return database_url[:64]


def _run(conn, sql: str) -> None:
    conn.execute(text(sql))


def apply_schema_patches(engine: Engine, *, database_url: str = "") -> None:
    if database_url:
        logger.info("Schema patches: target database …%s", _db_tail(database_url))

    with engine.begin() as conn:
        _run(
            conn,
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT TRUE",
        )
        _run(
            conn,
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS student_code VARCHAR(32)",
        )
        _run(conn, "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_student_code ON users (student_code)")

        _run(conn, "ALTER TABLE courses ADD COLUMN IF NOT EXISTS price_cents INTEGER NOT NULL DEFAULT 990000")
        _run(conn, "ALTER TABLE courses ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'NGN'")
        _run(conn, "ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT FALSE")

        _run(
            conn,
            "ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'enrolled'",
        )
        _run(
            conn,
            "ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
        )
        _run(conn, "UPDATE enrollments SET status = 'enrolled' WHERE status IS NULL OR status = ''")

        _run(conn, "ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(32)")
        _run(conn, "ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_reference VARCHAR(128)")
        _run(conn, "ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(32) NOT NULL DEFAULT 'bank_transfer'")
        _run(conn, "ALTER TABLE payments ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES enrollments(id) ON DELETE SET NULL")
        _run(conn, "ALTER TABLE payments ADD COLUMN IF NOT EXISTS verification_response TEXT")
        _run(conn, "ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ")
        _run(conn, "ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")
        _run(
            conn,
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_payments_payment_reference ON payments (payment_reference)",
        )
        _run(
            conn,
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_payments_transaction_reference ON payments (transaction_reference)",
        )

        _run(conn, "ALTER TABLE courses ADD COLUMN IF NOT EXISTS subtitle VARCHAR(512)")
        _run(conn, "ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_objectives TEXT")
        _run(conn, "ALTER TABLE courses ADD COLUMN IF NOT EXISTS category VARCHAR(64) NOT NULL DEFAULT 'general'")
        _run(conn, "ALTER TABLE courses ADD COLUMN IF NOT EXISTS level VARCHAR(32) NOT NULL DEFAULT 'beginner'")
        _run(conn, "ALTER TABLE courses ADD COLUMN IF NOT EXISTS language VARCHAR(8) NOT NULL DEFAULT 'en'")
        _run(conn, "ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 0")
        _run(conn, "ALTER TABLE courses ADD COLUMN IF NOT EXISTS tags VARCHAR(512)")
        _run(conn, "ALTER TABLE courses ADD COLUMN IF NOT EXISTS promo_video_url TEXT")
        _run(conn, "ALTER TABLE courses ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'draft'")
        _run(conn, "ALTER TABLE courses ADD COLUMN IF NOT EXISTS rejection_reason TEXT")
        _run(conn, "ALTER TABLE courses ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ")
        _run(conn, "ALTER TABLE courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")
        _run(conn, "ALTER TABLE courses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")

        _run(conn, "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS section_id UUID")
        _run(conn, "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS lesson_type VARCHAR(32) NOT NULL DEFAULT 'video'")
        _run(conn, "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_source VARCHAR(32)")
        _run(conn, "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_url TEXT")
        _run(conn, "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_duration_seconds INTEGER NOT NULL DEFAULT 0")
        _run(conn, "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_metadata TEXT")
        _run(conn, "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS quiz_json TEXT")
        _run(conn, "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS live_url TEXT")
        _run(conn, "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_previewable BOOLEAN NOT NULL DEFAULT FALSE")
        _run(conn, "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")

        _run(conn, "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512)")
        _run(conn, "ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL")
        _run(conn, "ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(16) NOT NULL DEFAULT 'password'")
        _run(conn, "ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_subject VARCHAR(255)")
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_users_oauth_subject ON users (oauth_subject)")

        _run(
            conn,
            """
            CREATE TABLE IF NOT EXISTS discount_codes (
                id UUID PRIMARY KEY,
                code VARCHAR(32) NOT NULL UNIQUE,
                label VARCHAR(255),
                discount_type VARCHAR(16) NOT NULL,
                discount_value INTEGER NOT NULL,
                course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
                max_uses INTEGER,
                used_count INTEGER NOT NULL DEFAULT 0,
                max_uses_per_user INTEGER NOT NULL DEFAULT 1,
                starts_at TIMESTAMPTZ,
                expires_at TIMESTAMPTZ,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """,
        )
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_discount_codes_code ON discount_codes (code)")
        _run(
            conn,
            """
            CREATE TABLE IF NOT EXISTS discount_redemptions (
                id UUID PRIMARY KEY,
                discount_code_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                payment_id UUID NOT NULL UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """,
        )
        _run(conn, "ALTER TABLE payments ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(32)")
        _run(
            conn,
            "ALTER TABLE payments ADD COLUMN IF NOT EXISTS discount_code_id UUID REFERENCES discount_codes(id) ON DELETE SET NULL",
        )
        _run(conn, "ALTER TABLE payments ADD COLUMN IF NOT EXISTS original_amount_cents INTEGER")
        _run(conn, "ALTER TABLE payments ADD COLUMN IF NOT EXISTS discount_cents INTEGER NOT NULL DEFAULT 0")

        _run(
            conn,
            """
            CREATE TABLE IF NOT EXISTS mentor_profiles (
                id UUID PRIMARY KEY,
                slug VARCHAR(128) NOT NULL UNIQUE,
                user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                full_name VARCHAR(255) NOT NULL,
                headline VARCHAR(255) NOT NULL DEFAULT '',
                bio TEXT NOT NULL DEFAULT '',
                photo_url VARCHAR(512),
                city VARCHAR(128) NOT NULL DEFAULT '',
                origin_country VARCHAR(128),
                years_in_germany INTEGER,
                german_level VARCHAR(32),
                field_of_work VARCHAR(128),
                expertise_areas TEXT NOT NULL DEFAULT '',
                languages_spoken VARCHAR(512) NOT NULL DEFAULT '',
                career_tips TEXT,
                approval_status VARCHAR(16) NOT NULL DEFAULT 'draft',
                rejection_reason TEXT,
                submitted_at TIMESTAMPTZ,
                approved_at TIMESTAMPTZ,
                is_featured BOOLEAN NOT NULL DEFAULT FALSE,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """,
        )
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_mentor_profiles_slug ON mentor_profiles (slug)")
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_mentor_profiles_user_id ON mentor_profiles (user_id)")
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_mentor_profiles_approval ON mentor_profiles (approval_status)")
        _run(conn, "ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS approval_status VARCHAR(16) NOT NULL DEFAULT 'draft'")
        _run(conn, "ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT")
        _run(conn, "ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ")
        _run(conn, "ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ")
        _run(conn, "ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS german_level VARCHAR(32)")
        _run(conn, "ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS field_of_work VARCHAR(128)")
        _run(conn, "DELETE FROM mentor_profiles WHERE user_id IS NULL")
        _run(
            conn,
            """
            DO $$
            BEGIN
              IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'mentor_profiles' AND column_name = 'is_published'
              ) THEN
                UPDATE mentor_profiles SET approval_status = 'approved'
                WHERE approval_status = 'draft' AND is_published IS TRUE;
                ALTER TABLE mentor_profiles DROP COLUMN is_published;
              END IF;
            END $$;
            """,
        )

        _run(
            conn,
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
            """,
        )
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_mentor_conversations_mentor_id ON mentor_conversations (mentor_id)")

        _run(
            conn,
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
            """,
        )
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_mentor_messages_conversation_id ON mentor_messages (conversation_id)")

        _run(conn, "UPDATE courses SET currency = 'NGN' WHERE currency IS NULL OR currency = '' OR currency = 'USD'")
        _run(conn, "UPDATE payments SET currency = 'NGN' WHERE currency IS NULL OR currency = '' OR currency = 'USD'")
        _run(
            conn,
            "UPDATE payments SET status = 'pending' WHERE status IS NULL OR status NOT IN "
            "('pending', 'awaiting_review', 'paid', 'completed', 'failed')",
        )
        _run(
            conn,
            "UPDATE enrollments SET status = 'enrolled' WHERE status IS NULL OR status NOT IN "
            "('pending_payment', 'enrolled', 'cancelled')",
        )

    Base.metadata.create_all(bind=engine)
    logger.info("Schema patches: column/table patches finished")
