import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.domain.models.gym_class import GymClass
from app.infrastructure.database.session import AsyncSessionLocal
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


async def _collect_upcoming_classes() -> int:
    now = datetime.now(timezone.utc)
    window_end = now + timedelta(hours=2)
    async with AsyncSessionLocal() as session:
        result = await session.scalars(
            select(GymClass).where(
                GymClass.scheduled_at >= now,
                GymClass.scheduled_at <= window_end,
            )
        )
        classes = list(result.all())
        logger.info("class_reminders_checked", extra={"upcoming_classes": len(classes)})
        return len(classes)


@celery_app.task(name="app.tasks.send_class_reminders")
def send_class_reminders() -> dict[str, int]:
    count = asyncio.run(_collect_upcoming_classes())
    return {"upcoming_classes": count}
