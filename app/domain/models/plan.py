from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import PlanPeriodType, enum_values
from app.infrastructure.database.base import Base, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.domain.models.member_subscription import MemberSubscription


class Plan(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "plans"

    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    credits_per_period: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    period_type: Mapped[PlanPeriodType] = mapped_column(
        Enum(PlanPeriodType, name="plan_period_type", values_callable=enum_values),
        nullable=False,
    )
    allows_free_pass: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    subscriptions: Mapped[list["MemberSubscription"]] = relationship(back_populates="plan")
