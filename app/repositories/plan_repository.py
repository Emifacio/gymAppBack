from uuid import UUID

from sqlalchemy import Select, select

from app.domain.models.plan import Plan
from app.repositories.base_repository import BaseRepository


class PlanRepository(BaseRepository[Plan]):
    def _query(self) -> Select[tuple[Plan]]:
        return select(Plan)

    async def get_by_id(self, plan_id: UUID, *, for_update: bool = False) -> Plan | None:
        stmt = self._query().where(Plan.id == plan_id)
        if for_update:
            stmt = stmt.with_for_update()
        return await self.session.scalar(stmt)

    async def get_by_name(self, name: str) -> Plan | None:
        return await self.session.scalar(self._query().where(Plan.name == name))

    async def list(
        self,
        *,
        active: bool | None = None,
        offset: int = 0,
        limit: int = 100,
    ) -> list[Plan]:
        stmt = self._query().order_by(Plan.created_at.desc()).offset(offset).limit(limit)
        if active is not None:
            stmt = stmt.where(Plan.active == active)
        result = await self.session.scalars(stmt)
        return list(result.all())
