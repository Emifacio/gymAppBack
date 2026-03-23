"""add billing enforcement fields to member subscriptions

Revision ID: 20260323_0001
Revises: 20d7c6759a1d
Create Date: 2026-03-23 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260323_0001"
down_revision = "20d7c6759a1d"
branch_labels = None
depends_on = None


billing_status = postgresql.ENUM(
    "active",
    "payment_due",
    "suspended",
    name="billing_status",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    billing_status.create(bind, checkfirst=True)

    op.add_column(
        "member_subscriptions",
        sa.Column(
            "billing_status",
            billing_status,
            nullable=False,
            server_default="active",
        ),
    )
    op.add_column(
        "member_subscriptions",
        sa.Column("next_due_date", sa.Date(), nullable=True),
    )
    op.add_column(
        "member_subscriptions",
        sa.Column("last_payment_date", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "member_subscriptions",
        sa.Column("suspended_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "member_subscriptions",
        sa.Column("reminder_due_sent_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "member_subscriptions",
        sa.Column("reminder_day_5_sent_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "member_subscriptions",
        sa.Column("reminder_day_9_sent_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.execute(
        sa.text(
            """
            UPDATE member_subscriptions
            SET next_due_date = DATE(period_end),
                last_payment_date = period_start,
                billing_status = 'active'
            """
        )
    )

    op.alter_column("member_subscriptions", "next_due_date", nullable=False)
    op.create_index(
        "idx_member_subscriptions_billing_status_next_due_date",
        "member_subscriptions",
        ["billing_status", "next_due_date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "idx_member_subscriptions_billing_status_next_due_date",
        table_name="member_subscriptions",
    )
    op.drop_column("member_subscriptions", "reminder_day_9_sent_at")
    op.drop_column("member_subscriptions", "reminder_day_5_sent_at")
    op.drop_column("member_subscriptions", "reminder_due_sent_at")
    op.drop_column("member_subscriptions", "suspended_at")
    op.drop_column("member_subscriptions", "last_payment_date")
    op.drop_column("member_subscriptions", "next_due_date")
    op.drop_column("member_subscriptions", "billing_status")

    billing_status.drop(op.get_bind(), checkfirst=True)
