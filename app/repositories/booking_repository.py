from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import selectinload

from app.domain.enums import BookingStatus
from app.domain.models.booking import Booking
from app.domain.models.gym_class import GymClass
from app.domain.models.instructor import Instructor
from app.domain.models.member import Member
from app.domain.models.member_subscription import MemberSubscription
from app.domain.models.plan import Plan
from app.repositories.base_repository import BaseRepository


class BookingRepository(BaseRepository[Booking]):
    def _detail_query(self) -> Select[tuple[Booking]]:
        return select(Booking).options(
            selectinload(Booking.member),
            selectinload(Booking.gym_class)
            .selectinload(GymClass.instructor)
            .selectinload(Instructor.member),
            selectinload(Booking.subscription).selectinload(MemberSubscription.plan),
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

    async def count_confirmed_bookings(self, class_id: UUID) -> int:
        stmt = select(func.count()).select_from(Booking).where(
            Booking.class_id == class_id,
            Booking.status == BookingStatus.CONFIRMED,
        )
        return await self.session.scalar(stmt) or 0

    async def count_confirmed_for_class(self, class_id: UUID) -> int:
        return await self.count_confirmed_bookings(class_id)

    async def list_confirmed_for_class(self, class_id: UUID) -> list[Booking]:
        stmt = (
            self._detail_query()
            .where(
                Booking.class_id == class_id,
                Booking.status == BookingStatus.CONFIRMED,
            )
            .order_by(Booking.booked_at.asc())
        )
        result = await self.session.scalars(stmt)
        return list(result.unique().all())

    async def list_confirmed_member_rows_for_class(self, class_id: UUID):
        stmt = (
            select(
                Booking.id,
                Booking.member_id,
                Member.full_name,
                Member.email,
                Booking.booked_at,
                Booking.booking_type,
                Booking.credits_consumed,
                Booking.assigned_by_admin,
                Booking.assigned_by_user_id,
                Booking.assigned_at,
            )
            .join(Member, Member.id == Booking.member_id)
            .where(
                Booking.class_id == class_id,
                Booking.status == BookingStatus.CONFIRMED,
            )
            .order_by(Booking.booked_at.asc())
        )
        result = await self.session.execute(stmt)
        return result.all()

    async def count_confirmed_for_class_ids(self, class_ids: list[UUID]) -> dict[UUID, int]:
        if not class_ids:
            return {}
        stmt = (
            select(Booking.class_id, func.count())
            .where(
                Booking.class_id.in_(class_ids),
                Booking.status == BookingStatus.CONFIRMED,
            )
            .group_by(Booking.class_id)
        )
        rows = await self.session.execute(stmt)
        return {class_id: count for class_id, count in rows.all()}

    async def list_confirmed_class_ids_for_member(
        self,
        member_id: UUID,
        class_ids: list[UUID],
    ) -> list[UUID]:
        if not class_ids:
            return []
        stmt = (
            select(Booking.class_id)
            .where(
                Booking.member_id == member_id,
                Booking.class_id.in_(class_ids),
                Booking.status == BookingStatus.CONFIRMED,
            )
        )
        result = await self.session.scalars(stmt)
        return list(result.all())
