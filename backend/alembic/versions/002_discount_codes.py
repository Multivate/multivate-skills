"""Discount codes for course pricing.

Revision ID: 002_discount_codes
Revises: 001_bank_transfer
Create Date: 2026-05-23
"""

from alembic import op

revision = "002_discount_codes"
down_revision = "001_bank_transfer"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS discount_codes (
            id UUID PRIMARY KEY,
            code VARCHAR(32) NOT NULL UNIQUE,
            label VARCHAR(255),
            discount_type VARCHAR(16) NOT NULL,
            discount_value INTEGER NOT NULL,
            course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
            max_uses INTEGER,
            used_count INTEGER NOT NULL DEFAULT 0,
            max_uses_per_user INTEGER NOT NULL DEFAULT 1,
            starts_at TIMESTAMPTZ,
            expires_at TIMESTAMPTZ,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_discount_codes_code ON discount_codes (code)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_discount_codes_course_id ON discount_codes (course_id)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS discount_redemptions (
            id UUID PRIMARY KEY,
            discount_code_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            payment_id UUID NOT NULL UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_discount_redemptions_discount_code_id ON discount_redemptions (discount_code_id)"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_discount_redemptions_user_id ON discount_redemptions (user_id)")

    op.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(32)")
    op.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS discount_code_id UUID REFERENCES discount_codes(id) ON DELETE SET NULL")
    op.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS original_amount_cents INTEGER")
    op.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS discount_cents INTEGER NOT NULL DEFAULT 0")
    op.execute("CREATE INDEX IF NOT EXISTS ix_payments_coupon_code ON payments (coupon_code)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_payments_discount_code_id ON payments (discount_code_id)")


def downgrade() -> None:
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS discount_cents")
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS original_amount_cents")
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS discount_code_id")
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS coupon_code")
    op.execute("DROP TABLE IF EXISTS discount_redemptions")
    op.execute("DROP TABLE IF EXISTS discount_codes")
