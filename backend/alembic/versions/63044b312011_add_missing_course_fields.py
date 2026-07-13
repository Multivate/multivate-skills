"""add missing course fields"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "63044b312011"
down_revision: Union[str, None] = "bb9b270f0f03"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.add_column(
        "courses",
        sa.Column("image_url", sa.Text(), nullable=False, server_default=""),
    )
    op.add_column(
        "courses",
        sa.Column("lessons_count", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("courses", "lessons_count")
    op.drop_column("courses", "image_url")
