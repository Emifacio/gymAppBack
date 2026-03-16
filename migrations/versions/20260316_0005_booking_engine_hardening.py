"""harden booking engine enums

Revision ID: 20260316_0005
Revises: 20260316_0004
Create Date: 2026-03-16 00:00:00.000000
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260316_0005"
down_revision = "20260316_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'waitlist'")
    op.execute("ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'attended'")
    op.execute("ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'no_show'")


def downgrade() -> None:
    # PostgreSQL enum values cannot be removed without rebuilding the type.
    pass
