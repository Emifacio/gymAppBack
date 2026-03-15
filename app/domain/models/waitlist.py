from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import WaitlistStatus, enum_values
from app.infrastructure.database.base import Base, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.domain.models.gym_class import GymClass
    from app.domain.models.member import Member


class Waitlist(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "waitlists"
    __table_args__ = (UniqueConstraint("member_id", "class_id", name="uq_waitlists_member_class"),)

    member_id = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    class_id = mapped_column(ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[WaitlistStatus] = mapped_column(
        Enum(WaitlistStatus, name="waitlist_status", values_callable=enum_values),
        default=WaitlistStatus.WAITING,
        nullable=False,
        index=True,
    )
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    promoted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    member: Mapped["Member"] = relationship(back_populates="waitlist_entries")
    gym_class: Mapped["GymClass"] = relationship(back_populates="waitlist_entries")
