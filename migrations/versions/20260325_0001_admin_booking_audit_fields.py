"""add admin assignment audit fields to bookings

Revision ID: 20260325_0001
Revises: 20260324_0001
Create Date: 2026-03-25 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260325_0001"
down_revision = "20260324_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "bookings",
        sa.Column("assigned_by_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "bookings",
        sa.Column("assigned_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "bookings",
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_bookings_assigned_by_user_id",
        "bookings",
        ["assigned_by_user_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_bookings_assigned_by_user_id_members",
        "bookings",
        "members",
        ["assigned_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.alter_column("bookings", "assigned_by_admin", server_default=None)


def downgrade() -> None:
    op.drop_constraint("fk_bookings_assigned_by_user_id_members", "bookings", type_="foreignkey")
    op.drop_index("ix_bookings_assigned_by_user_id", table_name="bookings")
    op.drop_column("bookings", "assigned_at")
    op.drop_column("bookings", "assigned_by_user_id")
    op.drop_column("bookings", "assigned_by_admin")
