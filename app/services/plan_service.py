from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.domain.models.plan import Plan
from app.repositories.plan_repository import PlanRepository
from app.schemas.plan_schema import PlanCreate, PlanRead, PlanUpdate


class PlanService:
    def __init__(self, session: AsyncSession, plan_repository: PlanRepository) -> None:
        self.session = session
        self.plan_repository = plan_repository

    async def list_plans(
        self,
        *,
        active: bool | None = None,
        offset: int = 0,
        limit: int = 100,
    ) -> list[PlanRead]:
        plans = await self.plan_repository.list(active=active, offset=offset, limit=limit)
        return [PlanRead.model_validate(plan) for plan in plans]

    async def get_plan_model(self, plan_id: UUID) -> Plan:
        plan = await self.plan_repository.get_by_id(plan_id)
        if plan is None:
            raise NotFoundError("Plan not found")
        return plan

    async def create_plan(self, payload: PlanCreate) -> PlanRead:
        if self.session.in_transaction():
            await self.session.rollback()
        async with self.session.begin():
            existing = await self.plan_repository.get_by_name(payload.name)
            if existing is not None:
                raise ConflictError("A plan with that name already exists")
            plan = Plan(**payload.model_dump())
            await self.plan_repository.add(plan)
        return PlanRead.model_validate(plan)

    async def update_plan(self, plan_id: UUID, payload: PlanUpdate) -> PlanRead:
        if self.session.in_transaction():
            await self.session.rollback()
        async with self.session.begin():
            plan = await self.plan_repository.get_by_id(plan_id, for_update=True)
            if plan is None:
                raise NotFoundError("Plan not found")

            update_data = payload.model_dump(exclude_unset=True)
            if "name" in update_data and update_data["name"] != plan.name:
                existing = await self.plan_repository.get_by_name(update_data["name"])
                if existing is not None:
                    raise ConflictError("A plan with that name already exists")

            for field_name, value in update_data.items():
                setattr(plan, field_name, value)

        refreshed = await self.get_plan_model(plan_id)
        return PlanRead.model_validate(refreshed)

    async def deactivate_plan(self, plan_id: UUID) -> None:
        if self.session.in_transaction():
            await self.session.rollback()
        async with self.session.begin():
            plan = await self.plan_repository.get_by_id(plan_id, for_update=True)
            if plan is None:
                raise NotFoundError("Plan not found")
            plan.active = False
