"""convert avatar urls to text

Revision ID: 20d7c6759a1d
Revises: 20260318_0002
Create Date: 2026-03-22 09:30:56.850696
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20d7c6759a1d'
down_revision = '20260318_0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column('members', 'google_picture_url', type_=sa.Text())
    op.alter_column('members', 'profile_image_url', type_=sa.Text())


def downgrade() -> None:
    op.alter_column('members', 'google_picture_url', type_=sa.String(500))
    op.alter_column('members', 'profile_image_url', type_=sa.String(500))

