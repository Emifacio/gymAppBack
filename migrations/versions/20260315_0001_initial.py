"""initial schema

Revision ID: 20260315_0001
Revises:
Create Date: 2026-03-15 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20260315_0001"
down_revision = None
branch_labels = None
depends_on = None


member_role = postgresql.ENUM("member", "instructor", "admin", name="member_role", create_type=False)
membership_status = postgresql.ENUM(
    "active",
    "inactive",
    "suspended",
    "cancelled",
    name="membership_status",
    create_type=False,
)
class_status = postgresql.ENUM("scheduled", "cancelled", "completed", name="class_status", create_type=False)
booking_status = postgresql.ENUM("confirmed", "cancelled", name="booking_status", create_type=False)
waitlist_status = postgresql.ENUM("waiting", "promoted", "cancelled", name="waitlist_status", create_type=False)
attendance_status = postgresql.ENUM("present", "absent", "late", name="attendance_status", create_type=False)
integration_provider = postgresql.ENUM("strava", name="integration_provider", create_type=False)
integration_status = postgresql.ENUM("connected", "expired", "revoked", name="integration_status", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    member_role.create(bind, checkfirst=True)
    membership_status.create(bind, checkfirst=True)
    class_status.create(bind, checkfirst=True)
    booking_status.create(bind, checkfirst=True)
    waitlist_status.create(bind, checkfirst=True)
    attendance_status.create(bind, checkfirst=True)
    integration_provider.create(bind, checkfirst=True)
    integration_status.create(bind, checkfirst=True)

    op.create_table(
        "membership_plans",
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("duration_days", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "members",
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("emergency_contact", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("role", member_role, nullable=False, server_default="member"),
        sa.Column("membership_status", membership_status, nullable=False, server_default="active"),
        sa.Column("membership_plan_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("profile_metadata", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["membership_plan_id"], ["membership_plans.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(op.f("ix_members_email"), "members", ["email"], unique=False)

    op.create_table(
        "instructors",
        sa.Column("member_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("specialties", sa.String(length=255), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["member_id"], ["members.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("member_id"),
    )

    op.create_table(
        "classes",
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("instructor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("location", sa.String(length=120), nullable=False),
        sa.Column("status", class_status, nullable=False, server_default="scheduled"),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["instructor_id"], ["instructors.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_classes_name"), "classes", ["name"], unique=False)
    op.create_index(op.f("ix_classes_scheduled_at"), "classes", ["scheduled_at"], unique=False)
    op.create_index(op.f("ix_classes_status"), "classes", ["status"], unique=False)

    op.create_table(
        "bookings",
        sa.Column("member_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("class_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", booking_status, nullable=False, server_default="confirmed"),
        sa.Column("booked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["class_id"], ["classes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["member_id"], ["members.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("member_id", "class_id", name="uq_bookings_member_class"),
    )
    op.create_index(op.f("ix_bookings_class_id"), "bookings", ["class_id"], unique=False)
    op.create_index(op.f("ix_bookings_member_id"), "bookings", ["member_id"], unique=False)
    op.create_index(op.f("ix_bookings_status"), "bookings", ["status"], unique=False)

    op.create_table(
        "waitlists",
        sa.Column("member_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("class_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("status", waitlist_status, nullable=False, server_default="waiting"),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("promoted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["class_id"], ["classes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["member_id"], ["members.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("member_id", "class_id", name="uq_waitlists_member_class"),
    )
    op.create_index(op.f("ix_waitlists_class_id"), "waitlists", ["class_id"], unique=False)
    op.create_index(op.f("ix_waitlists_member_id"), "waitlists", ["member_id"], unique=False)
    op.create_index(op.f("ix_waitlists_status"), "waitlists", ["status"], unique=False)

    op.create_table(
        "attendance",
        sa.Column("member_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("class_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("marked_by_instructor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", attendance_status, nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("mark_source", sa.String(length=32), nullable=False, server_default="manual"),
        sa.Column("marked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["class_id"], ["classes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["marked_by_instructor_id"], ["instructors.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["member_id"], ["members.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("member_id", "class_id", name="uq_attendance_member_class"),
    )
    op.create_index(op.f("ix_attendance_class_id"), "attendance", ["class_id"], unique=False)
    op.create_index(op.f("ix_attendance_member_id"), "attendance", ["member_id"], unique=False)

    op.create_table(
        "integration_accounts",
        sa.Column("member_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", integration_provider, nullable=False),
        sa.Column("external_account_id", sa.String(length=128), nullable=True),
        sa.Column("access_token", sa.String(length=255), nullable=False),
        sa.Column("refresh_token", sa.String(length=255), nullable=True),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", integration_status, nullable=False, server_default="connected"),
        sa.Column("provider_metadata", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["member_id"], ["members.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("member_id", "provider", name="uq_integration_member_provider"),
    )
    op.create_index(op.f("ix_integration_accounts_member_id"), "integration_accounts", ["member_id"], unique=False)

    op.create_table(
        "activities",
        sa.Column("member_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("integration_account_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("provider", integration_provider, nullable=False),
        sa.Column("external_id", sa.String(length=128), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("activity_type", sa.String(length=120), nullable=False),
        sa.Column("distance_meters", sa.Float(), nullable=True),
        sa.Column("moving_time_seconds", sa.Integer(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["integration_account_id"], ["integration_accounts.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["member_id"], ["members.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider", "external_id", name="uq_activities_provider_external"),
    )
    op.create_index(op.f("ix_activities_member_id"), "activities", ["member_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_activities_member_id"), table_name="activities")
    op.drop_table("activities")
    op.drop_index(op.f("ix_integration_accounts_member_id"), table_name="integration_accounts")
    op.drop_table("integration_accounts")
    op.drop_index(op.f("ix_attendance_member_id"), table_name="attendance")
    op.drop_index(op.f("ix_attendance_class_id"), table_name="attendance")
    op.drop_table("attendance")
    op.drop_index(op.f("ix_waitlists_status"), table_name="waitlists")
    op.drop_index(op.f("ix_waitlists_member_id"), table_name="waitlists")
    op.drop_index(op.f("ix_waitlists_class_id"), table_name="waitlists")
    op.drop_table("waitlists")
    op.drop_index(op.f("ix_bookings_status"), table_name="bookings")
    op.drop_index(op.f("ix_bookings_member_id"), table_name="bookings")
    op.drop_index(op.f("ix_bookings_class_id"), table_name="bookings")
    op.drop_table("bookings")
    op.drop_index(op.f("ix_classes_status"), table_name="classes")
    op.drop_index(op.f("ix_classes_scheduled_at"), table_name="classes")
    op.drop_index(op.f("ix_classes_name"), table_name="classes")
    op.drop_table("classes")
    op.drop_table("instructors")
    op.drop_index(op.f("ix_members_email"), table_name="members")
    op.drop_table("members")
    op.drop_table("membership_plans")

    integration_status.drop(op.get_bind(), checkfirst=True)
    integration_provider.drop(op.get_bind(), checkfirst=True)
    attendance_status.drop(op.get_bind(), checkfirst=True)
    waitlist_status.drop(op.get_bind(), checkfirst=True)
    booking_status.drop(op.get_bind(), checkfirst=True)
    class_status.drop(op.get_bind(), checkfirst=True)
    membership_status.drop(op.get_bind(), checkfirst=True)
    member_role.drop(op.get_bind(), checkfirst=True)
