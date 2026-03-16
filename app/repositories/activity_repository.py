from uuid import UUID

from sqlalchemy import select

from app.domain.enums import IntegrationProvider
from app.domain.models.activity import Activity
from app.repositories.base_repository import BaseRepository


class ActivityRepository(BaseRepository[Activity]):
    async def list_for_member(self, member_id: UUID) -> list[Activity]:
        result = await self.session.scalars(
            select(Activity).where(Activity.member_id == member_id).order_by(Activity.started_at.desc())
        )
        return list(result.all())

    async def get_by_provider_external_id(
        self,
        provider: IntegrationProvider,
        external_id: str,
    ) -> Activity | None:
        stmt = select(Activity).where(Activity.provider == provider, Activity.external_id == external_id)
        return await self.session.scalar(stmt)

    async def get_by_provider_external_ids(
        self,
        provider: IntegrationProvider,
        external_ids: list[str],
    ) -> dict[str, Activity]:
        if not external_ids:
            return {}
        result = await self.session.scalars(
            select(Activity).where(
                Activity.provider == provider,
                Activity.external_id.in_(external_ids),
            )
        )
        return {activity.external_id: activity for activity in result.all()}
