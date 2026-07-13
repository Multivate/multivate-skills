"""rename review_text column to comment

Revision ID: bb9b270f0f03
Revises: ed7d349e85ef
Create Date: 2026-07-13

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "bb9b270f0f03"
down_revision: Union[str, None] = "ed7d349e85ef"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "course_reviews",
        "review_text",
        new_column_name="comment",
        existing_type=sa.Text(),
    )


def downgrade() -> None:
    op.alter_column(
        "course_reviews",
        "comment",
        new_column_name="review_text",
        existing_type=sa.Text(),
    )
