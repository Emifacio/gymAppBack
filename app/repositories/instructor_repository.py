from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.domain.models.instructor import Instructor
from app.repositories.base_repository import BaseRepository


class InstructorRepository(BaseRepository[Instructor]):
    async def get_by_id(self, instructor_id: UUID) -> Instructor | None:
        stmt = select(Instructor).options(selectinload(Instructor.member)).where(Instructor.id == instructor_id)
        return await self.session.scalar(stmt)

    async def get_by_member_id(self, member_id: UUID) -> Instructor | None:
        stmt = select(Instructor).options(selectinload(Instructor.member)).where(Instructor.member_id == member_id)
        return await self.session.scalar(stmt)
