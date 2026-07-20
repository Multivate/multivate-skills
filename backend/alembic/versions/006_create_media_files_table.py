"""create media files table

Revision ID: 006_create_media_files_table
Revises: 63044b312011
Create Date: 2026-07-20

"""
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa


revision: str = "006_create_media_files_table"
down_revision: Union[str, None] = "63044b312011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "media_files",
        sa.Column("id", sa.Uuid(), primary_key=True, default=uuid.uuid4),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("stored_filename", sa.String(length=255), nullable=False, unique=True),
        sa.Column("mime_type", sa.String(length=127), nullable=False),
        sa.Column("extension", sa.String(length=16), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("folder", sa.String(length=64), nullable=False),
        sa.Column("relative_path", sa.String(length=512), nullable=False),
        sa.Column("public_url", sa.String(length=512), nullable=False),
        sa.Column("uploaded_by", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_media_files_folder", "media_files", ["folder"])
    op.create_index("ix_media_files_uploaded_by", "media_files", ["uploaded_by"])


def downgrade() -> None:
    op.drop_index("ix_media_files_uploaded_by", table_name="media_files")
    op.drop_index("ix_media_files_folder", table_name="media_files")
    op.drop_table("media_files")
