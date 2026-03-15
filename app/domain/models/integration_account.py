from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, Enum, ForeignKey, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import IntegrationProvider, IntegrationStatus, enum_values
from app.infrastructure.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.domain.models.activity import Activity
    from app.domain.models.member import Member


class IntegrationAccount(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "integration_accounts"
    __table_args__ = (
        UniqueConstraint("member_id", "provider", name="uq_integration_member_provider"),
    )

    member_id = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    provider: Mapped[IntegrationProvider] = mapped_column(
        Enum(IntegrationProvider, name="integration_provider", values_callable=enum_values),
        nullable=False,
    )
    external_account_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    access_token: Mapped[str] = mapped_column(String(255), nullable=False)
    refresh_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[IntegrationStatus] = mapped_column(
        Enum(IntegrationStatus, name="integration_status", values_callable=enum_values),
        default=IntegrationStatus.CONNECTED,
        nullable=False,
    )
    provider_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    member: Mapped["Member"] = relationship(back_populates="integration_accounts")
    activities: Mapped[list["Activity"]] = relationship(back_populates="integration_account")
