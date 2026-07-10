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
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Check columns
    columns = [c['name'] for c in inspector.get_columns('users')]
    if 'student_code' not in columns:
        op.add_column(
            'users',
            sa.Column('student_code', sa.String(32), nullable=True, unique=True)
        )
        
    # Check index
    indexes = [i['name'] for i in inspector.get_indexes('users')]
    if 'ix_users_student_code' not in indexes:
        op.create_index(
            'ix_users_student_code',
            'users',
            ['student_code'],
            unique=True
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Check index
    indexes = [i['name'] for i in inspector.get_indexes('users')]
    if 'ix_users_student_code' in indexes:
        op.drop_index('ix_users_student_code', table_name='users')
        
    # Check columns
    columns = [c['name'] for c in inspector.get_columns('users')]
    if 'student_code' in columns:
        op.drop_column('users', 'student_code')