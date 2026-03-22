from datetime import date
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, Date, Enum, ForeignKey, Index, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import AuthProvider, MemberRole, MembershipStatus, SubscriptionStatus, enum_values
from app.infrastructure.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.domain.models.activity import Activity
    from app.domain.models.attendance import Attendance
    from app.domain.models.booking import Booking
    from app.domain.models.integration_account import IntegrationAccount
    from app.domain.models.instructor import Instructor
    from app.domain.models.member_subscription import MemberSubscription
    from app.domain.models.membership_plan import MembershipPlan
    from app.domain.models.plan import Plan
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
    auth_provider: Mapped[AuthProvider] = mapped_column(
        Enum(AuthProvider, name="auth_provider", values_callable=enum_values),
        default=AuthProvider.LOCAL,
        nullable=False,
    )
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    google_picture_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    profile_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    membership_plan: Mapped["MembershipPlan | None"] = relationship(back_populates="members")
    instructor_profile: Mapped["Instructor | None"] = relationship(
        back_populates="member",
        uselist=False,
        cascade="all, delete-orphan",
    )
    subscriptions: Mapped[list["MemberSubscription"]] = relationship(
        back_populates="member",
        cascade="all, delete-orphan",
    )
    bookings: Mapped[list["Booking"]] = relationship(back_populates="member")
    waitlist_entries: Mapped[list["Waitlist"]] = relationship(back_populates="member")
    attendance_records: Mapped[list["Attendance"]] = relationship(back_populates="member")
    activities: Mapped[list["Activity"]] = relationship(back_populates="member")
    integration_accounts: Mapped[list["IntegrationAccount"]] = relationship(back_populates="member")

    @property
    def active_subscription(self) -> "MemberSubscription | None":
        active_subscriptions = [
            subscription
            for subscription in self.subscriptions
            if subscription.status == SubscriptionStatus.ACTIVE
        ]
        if not active_subscriptions:
            return None
        active_subscriptions.sort(key=lambda subscription: subscription.created_at, reverse=True)
        return active_subscriptions[0]


Index("idx_members_email_lower", func.lower(Member.email))
Index("idx_members_role_created_at", Member.role, Member.created_at)
Index("idx_members_membership_status_created_at", Member.membership_status, Member.created_at)
Index("idx_members_membership_plan_id", Member.membership_plan_id)
Index("idx_members_google_sub", Member.google_sub, unique=True)
