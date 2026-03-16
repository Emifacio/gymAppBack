from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, Enum, ForeignKey, Index, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import IntegrationProvider, enum_values
from app.infrastructure.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.domain.models.integration_account import IntegrationAccount
    from app.domain.models.member import Member


class Activity(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "activities"
    __table_args__ = (
        UniqueConstraint("provider", "external_id", name="uq_activities_provider_external"),
    )

    member_id = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    integration_account_id = mapped_column(
        ForeignKey("integration_accounts.id", ondelete="SET NULL"),
        nullable=True,
    )
    provider: Mapped[IntegrationProvider] = mapped_column(
        Enum(IntegrationProvider, name="integration_provider", values_callable=enum_values),
        nullable=False,
    )
    external_id: Mapped[str] = mapped_column(String(128), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    activity_type: Mapped[str] = mapped_column(String(120), nullable=False)
    distance_meters: Mapped[float | None] = mapped_column(nullable=True)
    moving_time_seconds: Mapped[int | None] = mapped_column(nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    member: Mapped["Member"] = relationship(back_populates="activities")
    integration_account: Mapped["IntegrationAccount | None"] = relationship(back_populates="activities")


Index("idx_activities_member_started_at", Activity.member_id, Activity.started_at)
Index("idx_activities_integration_account_id", Activity.integration_account_id)
