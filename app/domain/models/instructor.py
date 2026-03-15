from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.domain.models.attendance import Attendance
    from app.domain.models.gym_class import GymClass
    from app.domain.models.member import Member


class Instructor(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "instructors"

    member_id = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), unique=True, nullable=False)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    specialties: Mapped[str | None] = mapped_column(String(255), nullable=True)

    member: Mapped["Member"] = relationship(back_populates="instructor_profile")
    classes: Mapped[list["GymClass"]] = relationship(back_populates="instructor")
    attendance_marked: Mapped[list["Attendance"]] = relationship(back_populates="marked_by_instructor")

