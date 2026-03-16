"""expand booking statuses and drop legacy class counters

Revision ID: 20260316_0004
Revises: 20260316_0003
Create Date: 2026-03-16 00:00:00.000000
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260316_0004"
down_revision = "20260316_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'waitlist'")
    op.execute("ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'attended'")
    op.execute("ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'no_show'")
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'classes'
                  AND column_name = 'enrolled_members_count'
            ) THEN
                ALTER TABLE classes DROP COLUMN enrolled_members_count;
            END IF;

            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'classes'
                  AND column_name = 'enrolledMembersCount'
            ) THEN
                ALTER TABLE classes DROP COLUMN "enrolledMembersCount";
            END IF;
        END
        $$;
        """
    )


def downgrade() -> None:
    op.execute("UPDATE bookings SET status = 'cancelled' WHERE status = 'waitlist'")
    op.execute("UPDATE bookings SET status = 'confirmed' WHERE status IN ('attended', 'no_show')")
    op.execute("ALTER TABLE bookings ALTER COLUMN status DROP DEFAULT")
    op.execute("ALTER TYPE booking_status RENAME TO booking_status_old")
    op.execute("CREATE TYPE booking_status AS ENUM ('confirmed', 'cancelled')")
    op.execute(
        """
        ALTER TABLE bookings
        ALTER COLUMN status TYPE booking_status
        USING status::text::booking_status
        """
    )
    op.execute("DROP TYPE booking_status_old")
    op.execute("ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'confirmed'")
