from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import ClassStatus, enum_values
from app.infrastructure.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.domain.models.attendance import Attendance
    from app.domain.models.booking import Booking
    from app.domain.models.instructor import Instructor
    from app.domain.models.waitlist import Waitlist


class GymClass(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "classes"

    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    instructor_id = mapped_column(ForeignKey("instructors.id", ondelete="SET NULL"), nullable=True)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    location: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[ClassStatus] = mapped_column(
        Enum(ClassStatus, name="class_status", values_callable=enum_values),
        default=ClassStatus.SCHEDULED,
        nullable=False,
        index=True,
    )

    instructor: Mapped["Instructor | None"] = relationship(back_populates="classes")
    bookings: Mapped[list["Booking"]] = relationship(back_populates="gym_class", cascade="all, delete-orphan")
    waitlist_entries: Mapped[list["Waitlist"]] = relationship(
        back_populates="gym_class",
        cascade="all, delete-orphan",
    )
    attendance_records: Mapped[list["Attendance"]] = relationship(
        back_populates="gym_class",
        cascade="all, delete-orphan",
    )
