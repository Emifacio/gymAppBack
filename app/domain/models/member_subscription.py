from datetime import date, datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import BillingReminderStage, BillingStatus, SubscriptionStatus, enum_values
from app.infrastructure.database.base import Base, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.domain.models.booking import Booking
    from app.domain.models.member import Member
    from app.domain.models.plan import Plan


class MemberSubscription(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "member_subscriptions"
    __table_args__ = (
        Index("ix_member_subscriptions_member_id_status", "member_id", "status"),
        Index(
            "idx_member_subscriptions_member_status_created_at",
            "member_id",
            "status",
            "created_at",
        ),
        Index(
            "idx_member_subscriptions_status_period_end",
            "status",
            "period_end",
        ),
        Index(
            "idx_member_subscriptions_billing_status_next_due_date",
            "billing_status",
            "next_due_date",
        ),
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
    billing_status: Mapped[BillingStatus] = mapped_column(
        Enum(BillingStatus, name="billing_status", values_callable=enum_values),
        nullable=False,
        default=BillingStatus.ACTIVE,
        index=True,
    )
    next_due_date: Mapped[date] = mapped_column(Date, nullable=False)
    last_payment_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    suspended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reminder_due_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reminder_day_5_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reminder_day_9_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
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

    @property
    def effective_credits(self) -> int:
        if self.billing_status == BillingStatus.SUSPENDED:
            return 0
        return self.active_credits

    @property
    def billing_warning(self) -> dict[str, str] | None:
        if self.next_due_date is None:
            return None

        today = datetime.now(timezone.utc).date()
        overdue_days = (today - self.next_due_date).days
        if overdue_days < 0 and self.billing_status == BillingStatus.ACTIVE:
            return None

        if self.billing_status == BillingStatus.SUSPENDED:
            return {
                "stage": BillingReminderStage.SUSPENDED.value,
                "message": "Your account has been suspended due to non-payment. Please complete payment to restore access.",
            }

        if self.billing_status != BillingStatus.PAYMENT_DUE:
            return None

        if overdue_days >= 9:
            return {
                "stage": BillingReminderStage.DAY_9.value,
                "message": "Final reminder: your account will be suspended soon if payment is not received.",
            }
        if overdue_days >= 5:
            return {
                "stage": BillingReminderStage.DAY_5.value,
                "message": "Your payment is overdue. Please complete it to avoid suspension.",
            }
        if overdue_days == 0:
            return {
                "stage": BillingReminderStage.DUE_DATE.value,
                "message": "Your payment is due today.",
            }
        return {
            "stage": BillingReminderStage.OVERDUE.value,
            "message": "Your payment is overdue. Please complete it to avoid suspension.",
        }
