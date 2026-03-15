from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.orm import selectinload

from app.domain.enums import ClassStatus
from app.domain.models.gym_class import GymClass
from app.domain.models.instructor import Instructor
from app.repositories.base_repository import BaseRepository


class ClassRepository(BaseRepository[GymClass]):
    def _detail_query(self) -> Select[tuple[GymClass]]:
        return select(GymClass).options(
            selectinload(GymClass.instructor).selectinload(Instructor.member),
        )

    async def get_by_id(self, class_id: UUID, *, for_update: bool = False) -> GymClass | None:
        stmt = self._detail_query().where(GymClass.id == class_id)
        if for_update:
            stmt = stmt.with_for_update()
        return await self.session.scalar(stmt)

    async def list(
        self,
        *,
        status: ClassStatus | None = None,
        offset: int = 0,
        limit: int = 100,
    ) -> list[GymClass]:
        stmt = self._detail_query().order_by(GymClass.scheduled_at.asc()).offset(offset).limit(limit)
        if status is not None:
            stmt = stmt.where(GymClass.status == status)
        result = await self.session.scalars(stmt)
        return list(result.unique().all())

    async def delete(self, gym_class: GymClass) -> None:
        await self.session.delete(gym_class)

