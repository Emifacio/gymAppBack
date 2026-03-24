from sqlalchemy import select

from app.domain.models.revenuecat_webhook_event import RevenueCatWebhookEvent
from app.repositories.base_repository import BaseRepository


class RevenueCatWebhookEventRepository(BaseRepository[RevenueCatWebhookEvent]):
    async def exists_by_event_id(self, event_id: str) -> bool:
        stmt = select(RevenueCatWebhookEvent.id).where(RevenueCatWebhookEvent.event_id == event_id).limit(1)
        return (await self.session.scalar(stmt)) is not None

    async def create(
        self,
        *,
        event_id: str,
        app_user_id: str,
        event_type: str,
    ) -> RevenueCatWebhookEvent:
        event = RevenueCatWebhookEvent(
            event_id=event_id,
            app_user_id=app_user_id,
            event_type=event_type,
        )
        return await self.add(event)
