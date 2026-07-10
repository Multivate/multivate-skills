"""Bank transfer payment workflow schema.

Revision ID: 001_bank_transfer
Revises: 000_create_base_tables
Create Date: 2026-05-23
"""

from alembic import op

revision = "001_bank_transfer"
down_revision = "000_create_base_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS student_code VARCHAR(32)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_student_code ON users (student_code)")

    op.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS price_cents INTEGER NOT NULL DEFAULT 990000")
    op.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'NGN'")
    op.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT FALSE")

    op.execute(
        "ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'enrolled'"
    )
    op.execute(
        "ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
    )
    op.execute("UPDATE enrollments SET status = 'enrolled' WHERE status IS NULL OR status = ''")

    op.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(32)")
    op.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_reference VARCHAR(128)")
    op.execute(
        "ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(32) NOT NULL DEFAULT 'bank_transfer'"
    )
    op.execute(
        "ALTER TABLE payments ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES enrollments(id) ON DELETE SET NULL"
    )
    op.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS verification_response TEXT")
    op.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ")
    op.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_payments_payment_reference ON payments (payment_reference)"
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_payments_transaction_reference ON payments (transaction_reference)"
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS payment_audit_logs (
            id UUID PRIMARY KEY,
            payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
            actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            action VARCHAR(64) NOT NULL,
            detail TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_payment_audit_logs_payment_id ON payment_audit_logs (payment_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS payment_audit_logs")
    op.execute("DROP INDEX IF EXISTS ix_payments_transaction_reference")
    op.execute("DROP INDEX IF EXISTS ix_payments_payment_reference")
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS updated_at")
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS paid_at")
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS verification_response")
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS enrollment_id")
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS payment_method")
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS transaction_reference")
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS payment_reference")
    op.execute("ALTER TABLE enrollments DROP COLUMN IF EXISTS updated_at")
    op.execute("ALTER TABLE enrollments DROP COLUMN IF EXISTS status")
    op.execute("ALTER TABLE courses DROP COLUMN IF EXISTS is_free")
    op.execute("ALTER TABLE courses DROP COLUMN IF EXISTS currency")
    op.execute("ALTER TABLE courses DROP COLUMN IF EXISTS price_cents")
    op.execute("DROP INDEX IF EXISTS ix_users_student_code")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS student_code")