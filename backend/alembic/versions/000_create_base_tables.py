"""Create base tables from models.

Revision ID: 000_create_base_tables
Revises: 
Create Date: 2026-07-10
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "000_create_base_tables"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create base tables only if they don't exist
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

    op.execute("""
    CREATE TABLE IF NOT EXISTS enrollments (
        id UUID NOT NULL PRIMARY KEY,
        user_id UUID NOT NULL,
        course_id UUID NOT NULL,
        enrollment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completion_date TIMESTAMPTZ,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_enrollments_user_id ON enrollments (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_enrollments_course_id ON enrollments (course_id)")

    op.execute("""
    CREATE TABLE IF NOT EXISTS payments (
        id UUID NOT NULL PRIMARY KEY,
        user_id UUID,
        amount_cents INTEGER NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_payments_user_id ON payments (user_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS payments CASCADE")
    op.execute("DROP TABLE IF EXISTS enrollments CASCADE")
    op.execute("DROP TABLE IF EXISTS courses CASCADE")
    op.execute("DROP TABLE IF EXISTS users CASCADE")
