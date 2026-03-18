"""add google_picture_url and profile_image_url fields

Revision ID: 20260318_0002
Revises: 20260318_0001
Create Date: 2026-03-18 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260318_0002"
down_revision = "20260318_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "members",
        sa.Column("google_picture_url", sa.String(500), nullable=True),
    )
    op.add_column(
        "members",
        sa.Column("profile_image_url", sa.String(500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("members", "profile_image_url")
    op.drop_column("members", "google_picture_url")
