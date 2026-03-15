from datetime import date
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, Date, Enum, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import MemberRole, MembershipStatus, enum_values
from app.infrastructure.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.domain.models.activity import Activity
    from app.domain.models.attendance import Attendance
    from app.domain.models.booking import Booking
    from app.domain.models.integration_account import IntegrationAccount
    from app.domain.models.instructor import Instructor
    from app.domain.models.membership_plan import MembershipPlan
    from app.domain.models.waitlist import Waitlist


class Member(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "members"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    emergency_contact: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[MemberRole] = mapped_column(
        Enum(MemberRole, name="member_role", values_callable=enum_values),
        default=MemberRole.MEMBER,
        nullable=False,
    )
    membership_status: Mapped[MembershipStatus] = mapped_column(
        Enum(MembershipStatus, name="membership_status", values_callable=enum_values),
        default=MembershipStatus.ACTIVE,
        nullable=False,
    )
    membership_plan_id = mapped_column(
        ForeignKey("membership_plans.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    profile_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    membership_plan: Mapped["MembershipPlan | None"] = relationship(back_populates="members")
    instructor_profile: Mapped["Instructor | None"] = relationship(
        back_populates="member",
        uselist=False,
        cascade="all, delete-orphan",
    )
    bookings: Mapped[list["Booking"]] = relationship(back_populates="member")
    waitlist_entries: Mapped[list["Waitlist"]] = relationship(back_populates="member")
    attendance_records: Mapped[list["Attendance"]] = relationship(back_populates="member")
    activities: Mapped[list["Activity"]] = relationship(back_populates="member")
    integration_accounts: Mapped[list["IntegrationAccount"]] = relationship(back_populates="member")
