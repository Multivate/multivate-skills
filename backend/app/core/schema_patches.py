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
