"""add plans subscriptions and booking credits

Revision ID: 20260316_0002
Revises: 20260315_0001
Create Date: 2026-03-16 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20260316_0002"
down_revision = "20260315_0001"
branch_labels = None
depends_on = None


plan_period_type = postgresql.ENUM(
    "weekly",
    "monthly",
    name="plan_period_type",
    create_type=False,
)
subscription_status = postgresql.ENUM(
    "active",
    "expired",
    "cancelled",
    name="subscription_status",
    create_type=False,
)
booking_type = postgresql.ENUM(
    "credit",
    "free_pass",
    "waitlist",
    name="booking_type",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    plan_period_type.create(bind, checkfirst=True)
    subscription_status.create(bind, checkfirst=True)
    booking_type.create(bind, checkfirst=True)

    op.create_table(
        "plans",
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("credits_per_period", sa.Integer(), nullable=False),
        sa.Column("period_type", plan_period_type, nullable=False),
        sa.Column("allows_free_pass", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "member_subscriptions",
        sa.Column("member_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("active_credits", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", subscription_status, nullable=False, server_default="active"),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["member_id"], ["members.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["plan_id"], ["plans.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_member_subscriptions_member_id"), "member_subscriptions", ["member_id"], unique=False)
    op.create_index(op.f("ix_member_subscriptions_plan_id"), "member_subscriptions", ["plan_id"], unique=False)
    op.create_index(op.f("ix_member_subscriptions_status"), "member_subscriptions", ["status"], unique=False)
    op.create_index(
        "ix_member_subscriptions_member_id_status",
        "member_subscriptions",
        ["member_id", "status"],
        unique=False,
    )

    op.add_column(
        "bookings",
        sa.Column("subscription_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "bookings",
        sa.Column("booking_type", booking_type, nullable=False, server_default="credit"),
    )
    op.add_column(
        "bookings",
        sa.Column("credits_consumed", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_foreign_key(
        "fk_bookings_subscription_id_member_subscriptions",
        "bookings",
        "member_subscriptions",
        ["subscription_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(op.f("ix_bookings_subscription_id"), "bookings", ["subscription_id"], unique=False)
    op.create_index(op.f("ix_bookings_booking_type"), "bookings", ["booking_type"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_bookings_booking_type"), table_name="bookings")
    op.drop_index(op.f("ix_bookings_subscription_id"), table_name="bookings")
    op.drop_constraint("fk_bookings_subscription_id_member_subscriptions", "bookings", type_="foreignkey")
    op.drop_column("bookings", "credits_consumed")
    op.drop_column("bookings", "booking_type")
    op.drop_column("bookings", "subscription_id")

    op.drop_index("ix_member_subscriptions_member_id_status", table_name="member_subscriptions")
    op.drop_index(op.f("ix_member_subscriptions_status"), table_name="member_subscriptions")
    op.drop_index(op.f("ix_member_subscriptions_plan_id"), table_name="member_subscriptions")
    op.drop_index(op.f("ix_member_subscriptions_member_id"), table_name="member_subscriptions")
    op.drop_table("member_subscriptions")
    op.drop_table("plans")

    booking_type.drop(op.get_bind(), checkfirst=True)
    subscription_status.drop(op.get_bind(), checkfirst=True)
    plan_period_type.drop(op.get_bind(), checkfirst=True)
