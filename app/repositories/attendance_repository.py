from uuid import UUID

from sqlalchemy import select

from app.domain.models.attendance import Attendance
from app.repositories.base_repository import BaseRepository


class AttendanceRepository(BaseRepository[Attendance]):
    async def get_by_member_and_class(
        self,
        member_id: UUID,
        class_id: UUID,
        *,
        for_update: bool = False,
    ) -> Attendance | None:
        stmt = select(Attendance).where(Attendance.member_id == member_id, Attendance.class_id == class_id)
        if for_update:
            stmt = stmt.with_for_update()
        return await self.session.scalar(stmt)

    async def list_by_class(self, class_id: UUID) -> list[Attendance]:
        result = await self.session.scalars(
            select(Attendance).where(Attendance.class_id == class_id).order_by(Attendance.marked_at.desc())
        )
        return list(result.all())

    async def list_by_member(self, member_id: UUID) -> list[Attendance]:
        result = await self.session.scalars(
            select(Attendance).where(Attendance.member_id == member_id).order_by(Attendance.marked_at.desc())
        )
        return list(result.all())

