from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import selectinload

from app.domain.enums import WaitlistStatus
from app.domain.models.gym_class import GymClass
from app.domain.models.instructor import Instructor
from app.domain.models.waitlist import Waitlist
from app.repositories.base_repository import BaseRepository


class WaitlistRepository(BaseRepository[Waitlist]):
    def _detail_query(self) -> Select[tuple[Waitlist]]:
        return select(Waitlist).options(
            selectinload(Waitlist.member),
            selectinload(Waitlist.gym_class)
            .selectinload(GymClass.instructor)
            .selectinload(Instructor.member),
        )

    async def get_by_id(self, waitlist_id: UUID, *, for_update: bool = False) -> Waitlist | None:
        stmt = self._detail_query().where(Waitlist.id == waitlist_id)
        if for_update:
            stmt = stmt.with_for_update()
        return await self.session.scalar(stmt)

    async def get_by_member_and_class(
        self,
        member_id: UUID,
        class_id: UUID,
        *,
        for_update: bool = False,
    ) -> Waitlist | None:
        stmt = self._detail_query().where(Waitlist.member_id == member_id, Waitlist.class_id == class_id)
        if for_update:
            stmt = stmt.with_for_update()
        return await self.session.scalar(stmt)

    async def list_for_member(self, member_id: UUID) -> list[Waitlist]:
        stmt = (
            self._detail_query()
            .where(Waitlist.member_id == member_id)
            .order_by(Waitlist.joined_at.desc())
        )
        result = await self.session.scalars(stmt)
        return list(result.unique().all())

    async def next_position(self, class_id: UUID) -> int:
        stmt = select(func.max(Waitlist.position)).where(
            Waitlist.class_id == class_id,
            Waitlist.status == WaitlistStatus.WAITING,
        )
        current_max = await self.session.scalar(stmt)
        return (current_max or 0) + 1

    async def get_next_waitlist_booking(
        self,
        class_id: UUID,
        *,
        for_update: bool = False,
        excluded_ids: set[UUID] | None = None,
    ) -> Waitlist | None:
        stmt = (
            self._detail_query()
            .where(Waitlist.class_id == class_id, Waitlist.status == WaitlistStatus.WAITING)
            .order_by(Waitlist.position.asc(), Waitlist.joined_at.asc())
            .limit(1)
        )
        if excluded_ids:
            stmt = stmt.where(Waitlist.id.notin_(excluded_ids))
        if for_update:
            stmt = stmt.with_for_update()
        return await self.session.scalar(stmt)

    async def next_waiting_for_class(self, class_id: UUID, *, for_update: bool = False) -> Waitlist | None:
        return await self.get_next_waitlist_booking(class_id, for_update=for_update)

    async def list_waiting_for_class(self, class_id: UUID, *, for_update: bool = False) -> list[Waitlist]:
        stmt = (
            self._detail_query()
            .where(Waitlist.class_id == class_id, Waitlist.status == WaitlistStatus.WAITING)
            .order_by(Waitlist.position.asc(), Waitlist.joined_at.asc())
        )
        if for_update:
            stmt = stmt.with_for_update()
        result = await self.session.scalars(stmt)
        return list(result.unique().all())

    async def count_waiting_for_class_ids(self, class_ids: list[UUID]) -> dict[UUID, int]:
        if not class_ids:
            return {}
        stmt = (
            select(Waitlist.class_id, func.count())
            .where(
                Waitlist.class_id.in_(class_ids),
                Waitlist.status == WaitlistStatus.WAITING,
            )
            .group_by(Waitlist.class_id)
        )
        rows = await self.session.execute(stmt)
        return {class_id: count for class_id, count in rows.all()}

    async def list_waiting_class_ids_for_member(
        self,
        member_id: UUID,
        class_ids: list[UUID],
    ) -> list[UUID]:
        if not class_ids:
            return []
        stmt = (
            select(Waitlist.class_id)
            .where(
                Waitlist.member_id == member_id,
                Waitlist.class_id.in_(class_ids),
                Waitlist.status == WaitlistStatus.WAITING,
            )
        )
        result = await self.session.scalars(stmt)
        return list(result.all())
