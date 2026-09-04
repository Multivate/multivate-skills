"""merge media and instructor profile heads

Revision ID: 08601a4c2518
Revises: 006_create_media_files_table, c1f8d9a72e31
Create Date: 2026-09-04
"""

from typing import Sequence, Union

revision: str = "08601a4c2518"
down_revision: Union[str, Sequence[str], None] = (
    "006_create_media_files_table",
    "c1f8d9a72e31",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
