"""add revenuecat webhook events table

Revision ID: 20260324_0001
Revises: 20260323_0002
Create Date: 2026-03-24 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260324_0001"
down_revision = "20260323_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "revenuecat_webhook_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_id", sa.String(length=255), nullable=True),
        sa.Column("app_user_id", sa.String(length=255), nullable=False),
        sa.Column("event_type", sa.String(length=128), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id"),
    )
    op.create_index(
        "idx_revenuecat_webhook_events_received_at",
        "revenuecat_webhook_events",
        ["received_at"],
        unique=False,
    )
    op.create_index(
        "ix_revenuecat_webhook_events_app_user_id",
        "revenuecat_webhook_events",
        ["app_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_revenuecat_webhook_events_app_user_id", table_name="revenuecat_webhook_events")
    op.drop_index("idx_revenuecat_webhook_events_received_at", table_name="revenuecat_webhook_events")
    op.drop_table("revenuecat_webhook_events")
