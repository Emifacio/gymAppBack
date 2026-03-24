from datetime import datetime, timezone

from sqlalchemy import DateTime, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.base import Base, UUIDPrimaryKeyMixin


class RevenueCatWebhookEvent(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "revenuecat_webhook_events"
    __table_args__ = (
        Index("idx_revenuecat_webhook_events_received_at", "received_at"),
    )

    event_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    app_user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(128), nullable=False)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
