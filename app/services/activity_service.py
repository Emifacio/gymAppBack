from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.domain.enums import IntegrationProvider, IntegrationStatus
from app.domain.models.activity import Activity
from app.infrastructure.integrations.strava_client import StravaClient
from app.repositories.activity_repository import ActivityRepository
from app.repositories.integration_repository import IntegrationRepository
from app.repositories.member_repository import MemberRepository
from app.schemas.activity_schema import ActivityRead


class ActivityService:
    def __init__(
        self,
        session: AsyncSession,
        member_repository: MemberRepository,
        integration_repository: IntegrationRepository,
        activity_repository: ActivityRepository,
        strava_client: StravaClient,
    ) -> None:
        self.session = session
        self.member_repository = member_repository
        self.integration_repository = integration_repository
        self.activity_repository = activity_repository
        self.strava_client = strava_client

    async def list_member_activities(self, member_id: UUID) -> list[ActivityRead]:
        if await self.member_repository.get_by_id(member_id) is None:
            raise NotFoundError("Member not found")
        items = await self.activity_repository.list_for_member(member_id)
        return [ActivityRead.model_validate(item) for item in items]

    async def sync_member_activities(self, member_id: UUID) -> dict[str, int | str]:
        member = await self.member_repository.get_by_id(member_id)
        if member is None:
            raise NotFoundError("Member not found")

        account = await self.integration_repository.get_by_member_provider(member_id, IntegrationProvider.STRAVA)
        if account is None or account.status != IntegrationStatus.CONNECTED:
            raise NotFoundError("Connected Strava account not found")

        activities = await self.strava_client.fetch_activities(
            account.access_token,
            after=account.last_synced_at,
        )
        synced = 0
        now = datetime.now(timezone.utc)

        if self.session.in_transaction():
            await self.session.rollback()
        async with self.session.begin():
            account = await self.integration_repository.get_by_member_provider(member_id, IntegrationProvider.STRAVA)
            if account is None or account.status != IntegrationStatus.CONNECTED:
                raise NotFoundError("Connected Strava account not found")
            for item in activities:
                external_id = str(item["id"])
                activity = await self.activity_repository.get_by_provider_external_id(
                    IntegrationProvider.STRAVA,
                    external_id,
                )
                started_at = None
                if item.get("start_date"):
                    started_at = datetime.fromisoformat(item["start_date"].replace("Z", "+00:00"))

                if activity is None:
                    activity = Activity(
                        member_id=member_id,
                        integration_account_id=account.id,
                        provider=IntegrationProvider.STRAVA,
                        external_id=external_id,
                        name=item.get("name", "Unnamed activity"),
                        activity_type=item.get("type", "unknown"),
                        distance_meters=item.get("distance"),
                        moving_time_seconds=item.get("moving_time"),
                        started_at=started_at,
                        payload={
                            "average_speed": item.get("average_speed"),
                            "elapsed_time": item.get("elapsed_time"),
                        },
                    )
                    await self.activity_repository.add(activity)
                else:
                    activity.name = item.get("name", activity.name)
                    activity.activity_type = item.get("type", activity.activity_type)
                    activity.distance_meters = item.get("distance")
                    activity.moving_time_seconds = item.get("moving_time")
                    activity.started_at = started_at
                    activity.payload = {
                        "average_speed": item.get("average_speed"),
                        "elapsed_time": item.get("elapsed_time"),
                    }
                synced += 1

            account.last_synced_at = now

        return {"member_id": str(member_id), "synced_count": synced}
