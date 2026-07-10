"""Create base tables from models.

Revision ID: 000_create_base_tables
Revises: 
Create Date: 2026-07-10
"""

from alembic import op
import sqlalchemy as sa

revision = "000_create_base_tables"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id UUID NOT NULL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(320) NOT NULL UNIQUE,
        password_hash VARCHAR(255),
        auth_provider VARCHAR(16) NOT NULL DEFAULT 'password',
        oauth_subject VARCHAR(255),
        role VARCHAR(32) NOT NULL DEFAULT 'student',
        is_active BOOLEAN NOT NULL DEFAULT true,
        two_factor_enabled BOOLEAN NOT NULL DEFAULT true,
        student_code VARCHAR(32) UNIQUE,
        avatar_url VARCHAR(512),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_email ON users (email)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_oauth_subject ON users (oauth_subject)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_student_code ON users (student_code)")

    # Create courses table
    op.execute("""
    CREATE TABLE IF NOT EXISTS courses (
        id UUID NOT NULL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        instructor_id UUID,
        is_published BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL
    )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_courses_slug ON courses (slug)")

    # Create enrollments table
    op.execute("""
    CREATE TABLE IF NOT EXISTS enrollments (
        id UUID NOT NULL PRIMARY KEY,
        user_id UUID NOT NULL,
        course_id UUID NOT NULL,
        status VARCHAR(32) DEFAULT 'enrolled',
        enrollment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completion_date TIMESTAMPTZ,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_enrollments_user_id ON enrollments (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_enrollments_course_id ON enrollments (course_id)")

    # Create payments table
    op.execute("""
    CREATE TABLE IF NOT EXISTS payments (
        id UUID NOT NULL PRIMARY KEY,
        user_id UUID,
        amount_cents INTEGER NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        payment_reference VARCHAR(32),
        transaction_reference VARCHAR(128),
        payment_method VARCHAR(32) DEFAULT 'bank_transfer',
        enrollment_id UUID,
        verification_response TEXT,
        paid_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE SET NULL
    )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_payments_user_id ON payments (user_id)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_payments_payment_reference ON payments (payment_reference)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_payments_transaction_reference ON payments (transaction_reference)")

    # Create payment_audit_logs table
    op.execute("""
    CREATE TABLE IF NOT EXISTS payment_audit_logs (
        id UUID NOT NULL PRIMARY KEY,
        payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
        actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(64) NOT NULL,
        detail TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_payment_audit_logs_payment_id ON payment_audit_logs (payment_id)")

    # Create courses additional columns
    op.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS price_cents INTEGER DEFAULT 990000")
    op.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'NGN'")
    op.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT FALSE")

    # Create discount_codes table
    op.execute("""
    CREATE TABLE IF NOT EXISTS discount_codes (
        id UUID NOT NULL PRIMARY KEY,
        code VARCHAR(32) NOT NULL UNIQUE,
        discount_percent INTEGER,
        discount_fixed_cents INTEGER,
        max_uses INTEGER,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """)

    # Create discount_redemptions table
    op.execute("""
    CREATE TABLE IF NOT EXISTS discount_redemptions (
        id UUID NOT NULL PRIMARY KEY,
        discount_code_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """)

    # Create mentor_profiles table
    op.execute("""
    CREATE TABLE IF NOT EXISTS mentor_profiles (
        id UUID NOT NULL PRIMARY KEY,
        slug VARCHAR(128) NOT NULL UNIQUE,
        full_name VARCHAR(255) NOT NULL,
        headline VARCHAR(255) DEFAULT '',
        bio TEXT DEFAULT '',
        photo_url VARCHAR(512),
        city VARCHAR(128) DEFAULT '',
        origin_country VARCHAR(128),
        years_in_germany INTEGER,
        expertise_areas TEXT DEFAULT '',
        languages_spoken VARCHAR(512) DEFAULT '',
        career_tips TEXT,
        is_featured BOOLEAN DEFAULT FALSE,
        approval_status VARCHAR(16) DEFAULT 'draft',
        rejection_reason TEXT,
        submitted_at TIMESTAMPTZ,
        approved_at TIMESTAMPTZ,
        german_level VARCHAR(32),
        field_of_work VARCHAR(128),
        sort_order INTEGER DEFAULT 0,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_mentor_profiles_slug ON mentor_profiles (slug)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_mentor_profiles_user_id ON mentor_profiles (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_mentor_profiles_approval ON mentor_profiles (approval_status)")

    # Create mentor_conversations table
    op.execute("""
    CREATE TABLE IF NOT EXISTS mentor_conversations (
        id UUID NOT NULL PRIMARY KEY,
        mentor_id UUID NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
        visitor_name VARCHAR(255) NOT NULL,
        visitor_email VARCHAR(320),
        guest_token VARCHAR(64) NOT NULL UNIQUE,
        visitor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'open',
        last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_mentor_conversations_mentor_id ON mentor_conversations (mentor_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_mentor_conversations_guest_token ON mentor_conversations (guest_token)")

    # Create mentor_messages table
    op.execute("""
    CREATE TABLE IF NOT EXISTS mentor_messages (
        id UUID NOT NULL PRIMARY KEY,
        conversation_id UUID NOT NULL REFERENCES mentor_conversations(id) ON DELETE CASCADE,
        sender_kind VARCHAR(16) NOT NULL,
        sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        body TEXT NOT NULL,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_mentor_messages_conversation_id ON mentor_messages (conversation_id)")

    # Create other required tables
    op.execute("""
    CREATE TABLE IF NOT EXISTS certificates (
        id UUID NOT NULL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS course_sections (
        id UUID NOT NULL PRIMARY KEY,
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        sort_order INTEGER DEFAULT 0
    )
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS lessons (
        id UUID NOT NULL PRIMARY KEY,
        section_id UUID NOT NULL REFERENCES course_sections(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        video_url VARCHAR(512),
        sort_order INTEGER DEFAULT 0
    )
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS lesson_resources (
        id UUID NOT NULL PRIMARY KEY,
        lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        resource_url VARCHAR(512) NOT NULL
    )
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS course_reviews (
        id UUID NOT NULL PRIMARY KEY,
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL,
        review_text TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS course_audit_logs (
        id UUID NOT NULL PRIMARY KEY,
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(64) NOT NULL,
        detail TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS video_watch_histories (
        id UUID NOT NULL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        watched_until_seconds INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE,
        last_watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS mfa_otp_challenges (
        id UUID NOT NULL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
        id UUID NOT NULL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS inbox_messages (
        id UUID NOT NULL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS instructor_teaching_profiles (
        id UUID NOT NULL PRIMARY KEY,
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        bio TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS student_learning_profiles (
        id UUID NOT NULL PRIMARY KEY,
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        learning_goals TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS student_learning_profiles CASCADE")
    op.execute("DROP TABLE IF EXISTS instructor_teaching_profiles CASCADE")
    op.execute("DROP TABLE IF EXISTS inbox_messages CASCADE")
    op.execute("DROP TABLE IF EXISTS notifications CASCADE")
    op.execute("DROP TABLE IF EXISTS mfa_otp_challenges CASCADE")
    op.execute("DROP TABLE IF EXISTS video_watch_histories CASCADE")
    op.execute("DROP TABLE IF EXISTS course_audit_logs CASCADE")
    op.execute("DROP TABLE IF EXISTS course_reviews CASCADE")
    op.execute("DROP TABLE IF EXISTS lesson_resources CASCADE")
    op.execute("DROP TABLE IF EXISTS lessons CASCADE")
    op.execute("DROP TABLE IF EXISTS course_sections CASCADE")
    op.execute("DROP TABLE IF EXISTS certificates CASCADE")
    op.execute("DROP TABLE IF EXISTS mentor_messages CASCADE")
    op.execute("DROP TABLE IF EXISTS mentor_conversations CASCADE")
    op.execute("DROP TABLE IF EXISTS mentor_profiles CASCADE")
    op.execute("DROP TABLE IF EXISTS discount_redemptions CASCADE")
    op.execute("DROP TABLE IF EXISTS discount_codes CASCADE")
    op.execute("DROP TABLE IF EXISTS payment_audit_logs CASCADE")
    op.execute("DROP TABLE IF EXISTS payments CASCADE")
    op.execute("DROP TABLE IF EXISTS enrollments CASCADE")
    op.execute("DROP TABLE IF EXISTS courses CASCADE")
    op.execute("DROP TABLE IF EXISTS users CASCADE")
