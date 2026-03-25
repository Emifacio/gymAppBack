from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import BookingStatus, BookingType, enum_values
from app.infrastructure.database.base import Base, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.domain.models.gym_class import GymClass
    from app.domain.models.member import Member
    from app.domain.models.member_subscription import MemberSubscription


class Booking(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "bookings"
    __table_args__ = (UniqueConstraint("member_id", "class_id", name="uq_bookings_member_class"),)

    member_id = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    class_id = mapped_column(ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    subscription_id = mapped_column(
        ForeignKey("member_subscriptions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus, name="booking_status", values_callable=enum_values),
        default=BookingStatus.CONFIRMED,
        nullable=False,
        index=True,
    )
    booking_type: Mapped[BookingType] = mapped_column(
        Enum(BookingType, name="booking_type", values_callable=enum_values),
        default=BookingType.CREDIT,
        nullable=False,
        index=True,
    )
    credits_consumed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    booked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    assigned_by_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    assigned_by_user_id = mapped_column(
        ForeignKey("members.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    member: Mapped["Member"] = relationship(
        back_populates="bookings",
        foreign_keys=[member_id],
    )
    gym_class: Mapped["GymClass"] = relationship(back_populates="bookings")
    subscription: Mapped["MemberSubscription | None"] = relationship(back_populates="bookings")


Index("idx_bookings_class_status_booked_at", Booking.class_id, Booking.status, Booking.booked_at)
Index("idx_bookings_member_booked_at", Booking.member_id, Booking.booked_at)
