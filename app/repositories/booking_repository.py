from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import selectinload

from app.domain.enums import BookingStatus
from app.domain.models.booking import Booking
from app.domain.models.gym_class import GymClass
from app.domain.models.instructor import Instructor
from app.repositories.base_repository import BaseRepository


class BookingRepository(BaseRepository[Booking]):
    def _detail_query(self) -> Select[tuple[Booking]]:
        return select(Booking).options(
            selectinload(Booking.gym_class)
            .selectinload(GymClass.instructor)
            .selectinload(Instructor.member),
        )

    async def get_by_id(self, booking_id: UUID, *, for_update: bool = False) -> Booking | None:
        stmt = self._detail_query().where(Booking.id == booking_id)
        if for_update:
            stmt = stmt.with_for_update()
        return await self.session.scalar(stmt)

    async def get_by_member_and_class(
        self,
        member_id: UUID,
        class_id: UUID,
        *,
        for_update: bool = False,
    ) -> Booking | None:
        stmt = self._detail_query().where(Booking.member_id == member_id, Booking.class_id == class_id)
        if for_update:
            stmt = stmt.with_for_update()
        return await self.session.scalar(stmt)

    async def list_for_member(self, member_id: UUID) -> list[Booking]:
        stmt = (
            self._detail_query()
            .where(Booking.member_id == member_id)
            .order_by(Booking.booked_at.desc())
        )
        result = await self.session.scalars(stmt)
        return list(result.unique().all())

    async def count_confirmed_for_class(self, class_id: UUID) -> int:
        stmt = select(func.count()).select_from(Booking).where(
            Booking.class_id == class_id,
            Booking.status == BookingStatus.CONFIRMED,
        )
        return await self.session.scalar(stmt) or 0

