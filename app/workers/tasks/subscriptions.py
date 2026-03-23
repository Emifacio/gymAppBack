import asyncio

from app.infrastructure.database.session import AsyncSessionLocal
from app.repositories.member_repository import MemberRepository
from app.repositories.member_subscription_repository import MemberSubscriptionRepository
from app.repositories.plan_repository import PlanRepository
from app.services.billing_service import BillingService
from app.services.email_service import EmailService
from app.services.subscription_service import SubscriptionService
from app.workers.celery_app import celery_app


async def _reset_due_subscription_credits() -> int:
    async with AsyncSessionLocal() as session:
        member_subscription_repository = MemberSubscriptionRepository(session)
        billing_service = BillingService(
            session=session,
            member_subscription_repository=member_subscription_repository,
            cache=None,
            email_service=EmailService(),
        )
        service = SubscriptionService(
            session=session,
            member_repository=MemberRepository(session),
            plan_repository=PlanRepository(session),
            member_subscription_repository=member_subscription_repository,
            cache=None,
            billing_service=billing_service,
        )
        return await service.reset_due_subscriptions()


async def _run_daily_billing_enforcement() -> dict[str, int]:
    async with AsyncSessionLocal() as session:
        billing_service = BillingService(
            session=session,
            member_subscription_repository=MemberSubscriptionRepository(session),
            cache=None,
            email_service=EmailService(),
        )
        summary = await billing_service.process_daily_billing()
        return {
            "checked_subscriptions": summary.checked_subscriptions,
            "reminders_sent": summary.reminders_sent,
            "suspended_accounts": summary.suspended_accounts,
        }


@celery_app.task(name="app.tasks.reset_subscription_credits")
def reset_subscription_credits() -> dict[str, int]:
    reset_count = asyncio.run(_reset_due_subscription_credits())
    return {"reset_subscriptions": reset_count}


@celery_app.task(name="app.tasks.run_daily_billing_enforcement")
def run_daily_billing_enforcement() -> dict[str, int]:
    return asyncio.run(_run_daily_billing_enforcement())
