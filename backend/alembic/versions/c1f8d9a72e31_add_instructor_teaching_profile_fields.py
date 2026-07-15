"""Add instructor teaching profile fields."""

from alembic import op
import sqlalchemy as sa

revision = "c1f8d9a72e31"
down_revision = "63044b312011"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = {c["name"] for c in inspector.get_columns("instructor_teaching_profiles")}

    def add(name, column):
        if name not in cols:
            op.add_column("instructor_teaching_profiles", column)

    add("expertise_areas", sa.Column("expertise_areas", sa.Text(), nullable=False, server_default=""))
    add("teaching_bio", sa.Column("teaching_bio", sa.Text(), nullable=False, server_default=""))
    add("subjects_taught", sa.Column("subjects_taught", sa.Text(), nullable=False, server_default=""))
    add("years_experience", sa.Column("years_experience", sa.String(50), nullable=False, server_default=""))
    add("teaching_formats", sa.Column("teaching_formats", sa.Text(), nullable=False, server_default=""))
    add("credentials_notes", sa.Column("credentials_notes", sa.Text(), nullable=True))
    add("professional_links", sa.Column("professional_links", sa.Text(), nullable=True))


def downgrade():
    pass
