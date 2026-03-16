"""add performance indexes for hot query paths

Revision ID: 20260316_0003
Revises: 20260316_0002
Create Date: 2026-03-16 00:30:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260316_0003"
down_revision = "20260316_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("idx_members_email_lower", "members", [sa.text("lower(email)")], unique=False)
    op.create_index("idx_members_role_created_at", "members", ["role", "created_at"], unique=False)
    op.create_index(
        "idx_members_membership_status_created_at",
        "members",
        ["membership_status", "created_at"],
        unique=False,
    )
    op.create_index("idx_members_membership_plan_id", "members", ["membership_plan_id"], unique=False)

    op.create_index("idx_classes_status_scheduled_at", "classes", ["status", "scheduled_at"], unique=False)
    op.create_index("idx_classes_instructor_id", "classes", ["instructor_id"], unique=False)

    op.create_index(
        "idx_bookings_class_status_booked_at",
        "bookings",
        ["class_id", "status", "booked_at"],
        unique=False,
    )
    op.create_index("idx_bookings_member_booked_at", "bookings", ["member_id", "booked_at"], unique=False)

    op.create_index(
        "idx_waitlists_class_status_position_joined_at",
        "waitlists",
        ["class_id", "status", "position", "joined_at"],
        unique=False,
    )
    op.create_index("idx_waitlists_member_joined_at", "waitlists", ["member_id", "joined_at"], unique=False)

    op.create_index("idx_attendance_class_marked_at", "attendance", ["class_id", "marked_at"], unique=False)
    op.create_index("idx_attendance_member_marked_at", "attendance", ["member_id", "marked_at"], unique=False)
    op.create_index(
        "idx_attendance_marked_by_instructor_id",
        "attendance",
        ["marked_by_instructor_id"],
        unique=False,
    )

    op.create_index("idx_activities_member_started_at", "activities", ["member_id", "started_at"], unique=False)
    op.create_index(
        "idx_activities_integration_account_id",
        "activities",
        ["integration_account_id"],
        unique=False,
    )

    op.create_index(
        "idx_member_subscriptions_member_status_created_at",
        "member_subscriptions",
        ["member_id", "status", "created_at"],
        unique=False,
    )
    op.create_index(
        "idx_member_subscriptions_status_period_end",
        "member_subscriptions",
        ["status", "period_end"],
        unique=False,
    )

    op.create_index("idx_plans_active_created_at", "plans", ["active", "created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_plans_active_created_at", table_name="plans")

    op.drop_index("idx_member_subscriptions_status_period_end", table_name="member_subscriptions")
    op.drop_index("idx_member_subscriptions_member_status_created_at", table_name="member_subscriptions")

    op.drop_index("idx_activities_integration_account_id", table_name="activities")
    op.drop_index("idx_activities_member_started_at", table_name="activities")

    op.drop_index("idx_attendance_marked_by_instructor_id", table_name="attendance")
    op.drop_index("idx_attendance_member_marked_at", table_name="attendance")
    op.drop_index("idx_attendance_class_marked_at", table_name="attendance")

    op.drop_index("idx_waitlists_member_joined_at", table_name="waitlists")
    op.drop_index("idx_waitlists_class_status_position_joined_at", table_name="waitlists")

    op.drop_index("idx_bookings_member_booked_at", table_name="bookings")
    op.drop_index("idx_bookings_class_status_booked_at", table_name="bookings")

    op.drop_index("idx_classes_instructor_id", table_name="classes")
    op.drop_index("idx_classes_status_scheduled_at", table_name="classes")

    op.drop_index("idx_members_membership_plan_id", table_name="members")
    op.drop_index("idx_members_membership_status_created_at", table_name="members")
    op.drop_index("idx_members_role_created_at", table_name="members")
    op.drop_index("idx_members_email_lower", table_name="members")
