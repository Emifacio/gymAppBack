import asyncio
from uuid import UUID

from app.infrastructure.database.session import AsyncSessionLocal
from app.infrastructure.integrations.strava_client import StravaClient
from app.repositories.activity_repository import ActivityRepository
from app.repositories.integration_repository import IntegrationRepository
from app.repositories.member_repository import MemberRepository
from app.services.activity_service import ActivityService
from app.workers.celery_app import celery_app


async def _run_sync(member_id: UUID) -> dict[str, int | str]:
    async with AsyncSessionLocal() as session:
        service = ActivityService(
            session=session,
            member_repository=MemberRepository(session),
            integration_repository=IntegrationRepository(session),
            activity_repository=ActivityRepository(session),
            strava_client=StravaClient(),
        )
        return await service.sync_member_activities(member_id)


@celery_app.task(
    name="app.tasks.sync_member_activities",
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 5},
)
def sync_member_activities_task(self, member_id: str) -> dict[str, int | str]:
    return asyncio.run(_run_sync(UUID(member_id)))

