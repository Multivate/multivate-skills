def upgrade():
    op.alter_column(
        "course_reviews",
        "review_text",
        new_column_name="comment",
        existing_type=sa.Text(),
    )


def downgrade():
    op.alter_column(
        "course_reviews",
        "comment",
        new_column_name="review_text",
        existing_type=sa.Text(),
    )
