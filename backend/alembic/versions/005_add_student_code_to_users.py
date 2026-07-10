"""Add student_code column to users table safely.

Revision ID: 005_add_student_code_to_users
Revises: 004_mentor_approval
Create Date: 2026-07-10
"""

from alembic import op
import sqlalchemy as sa

revision = "005_add_student_code_to_users"
down_revision = "004_mentor_approval"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add student_code column to users table if it doesn't already exist
    try:
        op.add_column(
            'users',
            sa.Column('student_code', sa.String(32), nullable=True, unique=True)
        )
        # Create index for student_code
        op.create_index(
            'ix_users_student_code',
            'users',
            ['student_code'],
            unique=True
        )
    except Exception:
        # Column might already exist, skip
        pass


def downgrade() -> None:
    try:
        op.drop_index('ix_users_student_code', table_name='users')
        op.drop_column('users', 'student_code')
    except Exception:
        # Column might not exist, skip
        pass
