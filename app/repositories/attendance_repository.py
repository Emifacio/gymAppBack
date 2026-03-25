from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.domain.models.attendance import Attendance
from app.domain.models.gym_class import GymClass
from app.domain.models.instructor import Instructor
from app.repositories.base_repository import BaseRepository


class AttendanceRepository(BaseRepository[Attendance]):
    def _detail_query(self):
        return select(Attendance).options(
            selectinload(Attendance.gym_class)
            .selectinload(GymClass.instructor)
            .selectinload(Instructor.member),
        )

    async def get_by_member_and_class(
        self,
        member_id: UUID,
        class_id: UUID,
        *,
        for_update: bool = False,
    ) -> Attendance | None:
        stmt = self._detail_query().where(
            Attendance.member_id == member_id,
            Attendance.class_id == class_id,
        )
        if for_update:
            stmt = stmt.with_for_update()
        return await self.session.scalar(stmt)

    async def list_by_class(self, class_id: UUID) -> list[Attendance]:
        stmt = self._detail_query().where(Attendance.class_id == class_id).order_by(Attendance.marked_at.desc())
        result = await self.session.scalars(stmt)
        return list(result.unique().all())

    async def list_by_member(self, member_id: UUID) -> list[Attendance]:
        stmt = self._detail_query().where(Attendance.member_id == member_id).order_by(Attendance.marked_at.desc())
        result = await self.session.scalars(stmt)
        return list(result.unique().all())
