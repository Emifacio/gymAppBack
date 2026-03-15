from uuid import UUID

from sqlalchemy import select

from app.domain.models.membership_plan import MembershipPlan
from app.repositories.base_repository import BaseRepository


class MembershipPlanRepository(BaseRepository[MembershipPlan]):
    async def get_by_id(self, plan_id: UUID) -> MembershipPlan | None:
        return await self.session.scalar(select(MembershipPlan).where(MembershipPlan.id == plan_id))

