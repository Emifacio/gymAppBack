from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import BookingStatus, enum_values
from app.infrastructure.database.base import Base, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.domain.models.gym_class import GymClass
    from app.domain.models.member import Member


class Booking(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "bookings"
    __table_args__ = (UniqueConstraint("member_id", "class_id", name="uq_bookings_member_class"),)

    member_id = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    class_id = mapped_column(ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus, name="booking_status", values_callable=enum_values),
        default=BookingStatus.CONFIRMED,
        nullable=False,
        index=True,
    )
    booked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    member: Mapped["Member"] = relationship(back_populates="bookings")
    gym_class: Mapped["GymClass"] = relationship(back_populates="bookings")
