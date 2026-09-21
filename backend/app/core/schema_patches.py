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
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE",
        )
        # Password sign-in is the default; email codes are an optional login method (or opt-in 2FA).
        # Keep admin accounts on email 2FA. Idempotent for DBs that still have the old DEFAULT TRUE.
        _run(conn, "ALTER TABLE users ALTER COLUMN two_factor_enabled SET DEFAULT FALSE")
        _run(
            conn,
            "UPDATE users SET two_factor_enabled = FALSE WHERE role <> 'admin' AND two_factor_enabled IS TRUE",
        )

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
        _run(conn, "ALTER TABLE courses ADD COLUMN IF NOT EXISTS format VARCHAR(16) NOT NULL DEFAULT 'video'")
        _run(conn, "ALTER TABLE courses ADD COLUMN IF NOT EXISTS source_language VARCHAR(8) NOT NULL DEFAULT 'en'")
        _run(conn, "ALTER TABLE courses ADD COLUMN IF NOT EXISTS target_language VARCHAR(8) NOT NULL DEFAULT 'de'")
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_courses_format ON courses (format)")

        _run(conn, "ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS lesson_done INTEGER NOT NULL DEFAULT 0")
        _run(conn, "ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS progress_pct INTEGER NOT NULL DEFAULT 0")
        _run(conn, "ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")
        _run(
            conn,
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_enrollment_user_course ON enrollments (user_id, course_id)",
        )

        _run(conn, "ALTER TABLE payments ADD COLUMN IF NOT EXISTS course_id UUID")
        _run(conn, "ALTER TABLE payments ADD COLUMN IF NOT EXISTS external_ref VARCHAR(255)")
        _run(conn, "ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_payments_course_id ON payments (course_id)")
        _run(
            conn,
            """
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'payments_course_id_fkey'
              ) THEN
                ALTER TABLE payments
                  ADD CONSTRAINT payments_course_id_fkey
                  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;
              END IF;
            END $$;
            """,
        )

        _run(conn, "ALTER TABLE courses ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT ''")
        _run(conn, "ALTER TABLE courses ADD COLUMN IF NOT EXISTS lessons_count INTEGER NOT NULL DEFAULT 0")

        _run(conn, "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS course_id UUID")
        _run(conn, "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0")
        _run(conn, "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS body TEXT")
        _run(conn, "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 0")
        _run(conn, "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_lessons_course_id ON lessons (course_id)")
        _run(
            conn,
            """
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'lessons_course_id_fkey'
              ) THEN
                BEGIN
                  ALTER TABLE lessons
                    ADD CONSTRAINT lessons_course_id_fkey
                    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
                EXCEPTION WHEN others THEN
                  NULL;
                END;
              END IF;
            END $$;
            """,
        )

        # Heal MFA table if an older Alembic revision created plaintext `code` only.
        _run(conn, "ALTER TABLE mfa_otp_challenges ADD COLUMN IF NOT EXISTS purpose VARCHAR(32) NOT NULL DEFAULT 'login'")
        _run(conn, "ALTER TABLE mfa_otp_challenges ADD COLUMN IF NOT EXISTS code_hash VARCHAR(255)")
        _run(conn, "ALTER TABLE mfa_otp_challenges ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ")
        _run(conn, "ALTER TABLE certificates ADD COLUMN IF NOT EXISTS code VARCHAR(40)")
        _run(conn, "CREATE UNIQUE INDEX IF NOT EXISTS ix_certificates_code ON certificates (code)")

        _run(conn, "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512)")
        _run(conn, "ALTER TABLE users ADD COLUMN IF NOT EXISTS student_code VARCHAR(32)")
        _run(conn, "ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL")
        _run(conn, "ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(16) NOT NULL DEFAULT 'password'")
        _run(conn, "ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_subject VARCHAR(255)")
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_users_oauth_subject ON users (oauth_subject)")
        _run(conn, "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_student_code ON users (student_code)")
        _run(
            conn,
            """
            UPDATE users
            SET student_code = 'MTV-' || RIGHT(SPLIT_PART(student_code, '-', 2), 2) || '-' || LPAD(SPLIT_PART(student_code, '-', 3), 4, '0')
            WHERE student_code ~ '^STU-[0-9]{4}-[0-9]+$'
              AND NOT EXISTS (
                SELECT 1 FROM users u2
                WHERE u2.id <> users.id
                  AND u2.student_code = 'MTV-' || RIGHT(SPLIT_PART(users.student_code, '-', 2), 2) || '-' || LPAD(SPLIT_PART(users.student_code, '-', 3), 4, '0')
              )
            """,
        )


        # Course Studio: sections must exist before lesson.section_id FK.
        _run(
            conn,
            """
            CREATE TABLE IF NOT EXISTS course_sections (
                id UUID PRIMARY KEY,
                course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                position INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """,
        )
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_course_sections_course_id ON course_sections (course_id)")

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
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_lessons_section_id ON lessons (section_id)")
        # Add FK only when missing (idempotent for older DBs that already have the column).
        _run(
            conn,
            """
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'lessons_section_id_fkey'
              ) THEN
                ALTER TABLE lessons
                  ADD CONSTRAINT lessons_section_id_fkey
                  FOREIGN KEY (section_id) REFERENCES course_sections(id) ON DELETE SET NULL;
              END IF;
            END $$;
            """,
        )

        _run(
            conn,
            """
            CREATE TABLE IF NOT EXISTS audio_phrases (
                id UUID PRIMARY KEY,
                course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                section_id UUID REFERENCES course_sections(id) ON DELETE SET NULL,
                position INTEGER NOT NULL DEFAULT 0,
                source_text VARCHAR(512) NOT NULL,
                target_text VARCHAR(512) NOT NULL,
                audio_source VARCHAR(32),
                audio_url TEXT,
                audio_duration_seconds INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """,
        )
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_audio_phrases_course_id ON audio_phrases (course_id)")
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_audio_phrases_section_id ON audio_phrases (section_id)")

        _run(
            conn,
            """
            CREATE TABLE IF NOT EXISTS lesson_resources (
                id UUID PRIMARY KEY,
                lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                file_path TEXT NOT NULL,
                file_type VARCHAR(64) NOT NULL,
                file_size_bytes INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """,
        )
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_lesson_resources_lesson_id ON lesson_resources (lesson_id)")

        _run(
            conn,
            """
            CREATE TABLE IF NOT EXISTS video_watch_history (
                id UUID PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
                position_seconds INTEGER NOT NULL DEFAULT 0,
                watch_time_seconds INTEGER NOT NULL DEFAULT 0,
                completed BOOLEAN NOT NULL DEFAULT FALSE,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """,
        )
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_video_watch_history_user_id ON video_watch_history (user_id)")
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_video_watch_history_lesson_id ON video_watch_history (lesson_id)")

        _run(
            conn,
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
            """,
        )
        _run(
            conn,
            "CREATE INDEX IF NOT EXISTS ix_audio_phrase_progress_user_id ON audio_phrase_progress (user_id)",
        )
        _run(
            conn,
            "CREATE INDEX IF NOT EXISTS ix_audio_phrase_progress_phrase_id ON audio_phrase_progress (phrase_id)",
        )

        _run(
            conn,
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
            """,
        )
        _run(
            conn,
            "CREATE INDEX IF NOT EXISTS ix_audio_module_assessments_user_id ON audio_module_assessments (user_id)",
        )
        _run(
            conn,
            "CREATE INDEX IF NOT EXISTS ix_audio_module_assessments_course_id ON audio_module_assessments (course_id)",
        )

        _run(
            conn,
            """
            CREATE TABLE IF NOT EXISTS media_files (
                id UUID PRIMARY KEY,
                original_filename VARCHAR(255) NOT NULL,
                stored_filename VARCHAR(255) NOT NULL UNIQUE,
                mime_type VARCHAR(127) NOT NULL,
                extension VARCHAR(16) NOT NULL,
                size_bytes BIGINT NOT NULL,
                folder VARCHAR(64) NOT NULL,
                relative_path VARCHAR(512) NOT NULL,
                public_url VARCHAR(512) NOT NULL,
                uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at TIMESTAMPTZ
            )
            """,
        )
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_media_files_folder ON media_files (folder)")
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_media_files_uploaded_by ON media_files (uploaded_by)")

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
        # Heal Alembic 000 shape (had redeemed_at, no payment_id/created_at).
        _run(conn, "ALTER TABLE discount_redemptions ADD COLUMN IF NOT EXISTS payment_id UUID")
        _run(conn, "ALTER TABLE discount_redemptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")
        _run(
            conn,
            """
            DO $$
            BEGIN
              IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'discount_redemptions' AND column_name = 'redeemed_at'
              ) THEN
                EXECUTE 'UPDATE discount_redemptions SET created_at = redeemed_at WHERE redeemed_at IS NOT NULL';
              END IF;
            END $$;
            """,
        )
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_discount_redemptions_discount_code_id ON discount_redemptions (discount_code_id)")
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_discount_redemptions_user_id ON discount_redemptions (user_id)")
        _run(
            conn,
            """
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'discount_redemptions_payment_id_fkey'
              ) THEN
                BEGIN
                  ALTER TABLE discount_redemptions
                    ADD CONSTRAINT discount_redemptions_payment_id_fkey
                    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE;
                EXCEPTION WHEN others THEN
                  NULL;
                END;
              END IF;
              IF NOT EXISTS (
                SELECT 1 FROM pg_indexes WHERE indexname = 'discount_redemptions_payment_id_key'
              ) AND NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'discount_redemptions_payment_id_key'
              ) THEN
                BEGIN
                  CREATE UNIQUE INDEX IF NOT EXISTS ix_discount_redemptions_payment_id
                    ON discount_redemptions (payment_id);
                EXCEPTION WHEN others THEN
                  NULL;
                END;
              END IF;
            END $$;
            """,
        )

        # Heal Alembic 000 inbox_messages (user_id/message/read) → sender_id/recipient_id/body/read_at.
        _run(conn, "ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS sender_id UUID")
        _run(conn, "ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS recipient_id UUID")
        _run(conn, "ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS body TEXT")
        _run(conn, "ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ")
        _run(
            conn,
            """
            DO $$
            BEGIN
              IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'inbox_messages' AND column_name = 'user_id'
              ) THEN
                EXECUTE 'UPDATE inbox_messages SET sender_id = user_id WHERE sender_id IS NULL';
                EXECUTE 'UPDATE inbox_messages SET recipient_id = user_id WHERE recipient_id IS NULL';
              END IF;
              IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'inbox_messages' AND column_name = 'message'
              ) THEN
                EXECUTE 'UPDATE inbox_messages SET body = message WHERE body IS NULL';
              END IF;
              IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'inbox_messages' AND column_name = 'read'
              ) THEN
                EXECUTE 'UPDATE inbox_messages SET read_at = created_at WHERE read IS TRUE AND read_at IS NULL';
              END IF;
            END $$;
            """,
        )
        _run(conn, "UPDATE inbox_messages SET body = COALESCE(body, '') WHERE body IS NULL")
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_inbox_messages_sender_id ON inbox_messages (sender_id)")
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_inbox_messages_recipient_id ON inbox_messages (recipient_id)")

        # Heal Alembic 000 notifications (message/read) → body/kind/link_href/read_at.
        # Old `message TEXT NOT NULL` with no default makes ORM inserts fail.
        _run(
            conn,
            """
            CREATE TABLE IF NOT EXISTS notifications (
                id UUID NOT NULL PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                kind VARCHAR(48) NOT NULL DEFAULT 'general',
                title VARCHAR(255) NOT NULL,
                body TEXT NOT NULL DEFAULT '',
                link_href VARCHAR(512),
                read_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """,
        )
        _run(conn, "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS kind VARCHAR(48) NOT NULL DEFAULT 'general'")
        _run(conn, "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body TEXT")
        _run(conn, "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link_href VARCHAR(512)")
        _run(conn, "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ")
        _run(
            conn,
            """
            DO $$
            BEGIN
              IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'notifications' AND column_name = 'message'
              ) THEN
                EXECUTE 'UPDATE notifications SET body = message WHERE body IS NULL';
                BEGIN
                  ALTER TABLE notifications ALTER COLUMN message DROP NOT NULL;
                EXCEPTION WHEN others THEN
                  NULL;
                END;
                BEGIN
                  ALTER TABLE notifications ALTER COLUMN message SET DEFAULT '';
                EXCEPTION WHEN others THEN
                  NULL;
                END;
              END IF;
              IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'notifications' AND column_name = 'read'
              ) THEN
                EXECUTE 'UPDATE notifications SET read_at = created_at WHERE read IS TRUE AND read_at IS NULL';
              END IF;
            END $$;
            """,
        )
        _run(conn, "UPDATE notifications SET body = COALESCE(body, '') WHERE body IS NULL")
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications (user_id)")
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_notifications_kind ON notifications (kind)")
        _run(
            conn,
            """
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'inbox_messages_sender_id_fkey'
              ) THEN
                BEGIN
                  ALTER TABLE inbox_messages
                    ADD CONSTRAINT inbox_messages_sender_id_fkey
                    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
                EXCEPTION WHEN others THEN
                  NULL;
                END;
              END IF;
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'inbox_messages_recipient_id_fkey'
              ) THEN
                BEGIN
                  ALTER TABLE inbox_messages
                    ADD CONSTRAINT inbox_messages_recipient_id_fkey
                    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE;
                EXCEPTION WHEN others THEN
                  NULL;
                END;
              END IF;
            END $$;
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

        _run(
            conn,
            """
            CREATE TABLE IF NOT EXISTS certificates (
                id UUID PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                code VARCHAR(40) NOT NULL UNIQUE,
                issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (user_id, course_id)
            )
            """,
        )
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_certificates_user_id ON certificates (user_id)")
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_certificates_course_id ON certificates (course_id)")
        _run(conn, "CREATE UNIQUE INDEX IF NOT EXISTS ix_certificates_code ON certificates (code)")

        _run(
            conn,
            """
            CREATE TABLE IF NOT EXISTS mfa_otp_challenges (
                id UUID PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                purpose VARCHAR(32) NOT NULL,
                code_hash VARCHAR(255) NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                consumed_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """,
        )
        _run(conn, "CREATE INDEX IF NOT EXISTS ix_mfa_otp_challenges_user_id ON mfa_otp_challenges (user_id)")

        _run(
            conn,
            """
            CREATE TABLE IF NOT EXISTS mentor_session_bookings (
                id UUID PRIMARY KEY,
                student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                mentor_profile_id UUID REFERENCES mentor_profiles(id) ON DELETE SET NULL,
                tier VARCHAR(32) NOT NULL,
                status VARCHAR(32) NOT NULL DEFAULT 'pending_payment',
                duration_minutes INTEGER NOT NULL DEFAULT 45,
                billed_hours INTEGER NOT NULL DEFAULT 1,
                amount_cents INTEGER NOT NULL,
                currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
                course_slug VARCHAR(128),
                preferred_time_note TEXT,
                scheduled_at TIMESTAMPTZ,
                meeting_url VARCHAR(512),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """,
        )
        _run(
            conn,
            "CREATE INDEX IF NOT EXISTS ix_mentor_session_bookings_student_id ON mentor_session_bookings (student_id)",
        )
        _run(
            conn,
            "CREATE INDEX IF NOT EXISTS ix_mentor_session_bookings_mentor_profile_id ON mentor_session_bookings (mentor_profile_id)",
        )
        _run(
            conn,
            "CREATE INDEX IF NOT EXISTS ix_mentor_session_bookings_status ON mentor_session_bookings (status)",
        )
        _run(
            conn,
            "ALTER TABLE payments ADD COLUMN IF NOT EXISTS mentor_session_id UUID REFERENCES mentor_session_bookings(id) ON DELETE SET NULL",
        )
        _run(
            conn,
            "CREATE INDEX IF NOT EXISTS ix_payments_mentor_session_id ON payments (mentor_session_id)",
        )
        _run(
            conn,
            "ALTER TABLE student_learning_profiles ADD COLUMN IF NOT EXISTS weekly_course_target INTEGER NOT NULL DEFAULT 1",
        )

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

    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Schema patches: column/table patches finished")
    except Exception as exc:
        logger.warning("Schema patches: create_all() skipped (tables may already exist): %s", exc)