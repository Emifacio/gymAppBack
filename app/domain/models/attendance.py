from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import AttendanceStatus, enum_values
from app.infrastructure.database.base import Base, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.domain.models.gym_class import GymClass
    from app.domain.models.instructor import Instructor
    from app.domain.models.member import Member


class Attendance(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "attendance"
    __table_args__ = (UniqueConstraint("member_id", "class_id", name="uq_attendance_member_class"),)

    member_id = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    class_id = mapped_column(ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    marked_by_instructor_id = mapped_column(
        ForeignKey("instructors.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(AttendanceStatus, name="attendance_status", values_callable=enum_values),
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    mark_source: Mapped[str] = mapped_column(String(32), default="manual", nullable=False)
    marked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    member: Mapped["Member"] = relationship(back_populates="attendance_records")
    gym_class: Mapped["GymClass"] = relationship(back_populates="attendance_records")
    marked_by_instructor: Mapped["Instructor | None"] = relationship(back_populates="attendance_marked")
