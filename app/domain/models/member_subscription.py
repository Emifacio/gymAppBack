from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import SubscriptionStatus, enum_values
from app.infrastructure.database.base import Base, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.domain.models.booking import Booking
    from app.domain.models.member import Member
    from app.domain.models.plan import Plan


class MemberSubscription(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "member_subscriptions"
    __table_args__ = (
        Index("ix_member_subscriptions_member_id_status", "member_id", "status"),
    )

    member_id = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = mapped_column(ForeignKey("plans.id", ondelete="RESTRICT"), nullable=False, index=True)
    active_credits: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus, name="subscription_status", values_callable=enum_values),
        nullable=False,
        default=SubscriptionStatus.ACTIVE,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    member: Mapped["Member"] = relationship(back_populates="subscriptions")
    plan: Mapped["Plan"] = relationship(back_populates="subscriptions")
    bookings: Mapped[list["Booking"]] = relationship(back_populates="subscription")

    @property
    def is_free_pass(self) -> bool:
        return bool(self.plan and self.plan.allows_free_pass)
