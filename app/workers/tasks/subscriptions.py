import asyncio

from app.infrastructure.database.session import AsyncSessionLocal
from app.repositories.member_repository import MemberRepository
from app.repositories.member_subscription_repository import MemberSubscriptionRepository
from app.repositories.plan_repository import PlanRepository
from app.services.subscription_service import SubscriptionService
from app.workers.celery_app import celery_app


async def _reset_due_subscription_credits() -> int:
    async with AsyncSessionLocal() as session:
        service = SubscriptionService(
            session=session,
            member_repository=MemberRepository(session),
            plan_repository=PlanRepository(session),
            member_subscription_repository=MemberSubscriptionRepository(session),
            cache=None,
        )
        return await service.reset_due_subscriptions()


@celery_app.task(name="app.tasks.reset_subscription_credits")
def reset_subscription_credits() -> dict[str, int]:
    reset_count = asyncio.run(_reset_due_subscription_credits())
    return {"reset_subscriptions": reset_count}
