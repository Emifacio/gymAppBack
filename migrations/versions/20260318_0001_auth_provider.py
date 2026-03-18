"""add auth_provider and google_sub fields

Revision ID: 20260318_0001
Revises: 20260316_0005
Create Date: 2026-03-18 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260318_0001"
down_revision = "20260316_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE TYPE auth_provider AS ENUM ('local', 'google')")

    op.add_column(
        "members",
        sa.Column("auth_provider", sa.Enum("local", "google", name="auth_provider", create_type=False), nullable=False, server_default="local"),
    )
    op.add_column(
        "members",
        sa.Column("google_sub", sa.String(255), nullable=True),
    )

    op.create_index("idx_members_google_sub", "members", ["google_sub"], unique=True, postgresql_where=sa.text("google_sub IS NOT NULL"))

    op.execute(
        """
        UPDATE members
        SET auth_provider = 'google'
        WHERE password_hash = '' OR password_hash IS NULL
        """
    )

    op.alter_column("members", "auth_provider", nullable=False)


def downgrade() -> None:
    op.drop_index("idx_members_google_sub", table_name="members", postgresql_where=sa.text("google_sub IS NOT NULL"))
    op.drop_column("members", "google_sub")
    op.drop_column("members", "auth_provider")
    op.execute("DROP TYPE auth_provider")
