import asyncio
import logging
from uuid import UUID

from app.infrastructure.database.session import AsyncSessionLocal
from app.repositories.booking_repository import BookingRepository
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


async def _send_waitlist_notification(booking_id: str) -> dict[str, str | int]:
    async with AsyncSessionLocal() as session:
        booking = await BookingRepository(session).get_by_id(UUID(booking_id))
        if booking is None or booking.member is None or booking.gym_class is None:
            return {"sent": 0, "booking_id": booking_id}

        logger.info(
            "waitlist_member_promoted booking_id=%s member_id=%s member_email=%s class_id=%s class_name=%s",
            booking.id,
            booking.member_id,
            booking.member.email,
            booking.class_id,
            booking.gym_class.name,
        )
        return {"sent": 1, "booking_id": booking_id}


@celery_app.task(name="app.tasks.send_waitlist_notifications")
def send_waitlist_notifications(booking_id: str) -> dict[str, str | int]:
    return asyncio.run(_send_waitlist_notification(booking_id))
