from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.domain.enums import BookingStatus, ClassStatus, MemberRole, MembershipStatus, WaitlistStatus
from app.domain.models.booking import Booking
from app.domain.models.member import Member
from app.domain.models.waitlist import Waitlist
from app.infrastructure.cache.redis_client import RedisCache
from app.repositories.booking_repository import BookingRepository
from app.repositories.class_repository import ClassRepository
from app.repositories.member_repository import MemberRepository
from app.repositories.waitlist_repository import WaitlistRepository
from app.schemas.booking_schema import (
    BookingActionResponse,
    BookingCancellationResponse,
    BookingCreate,
    BookingRead,
    MemberBookingsResponse,
    WaitlistRead,
)


class BookingService:
    def __init__(
        self,
        session: AsyncSession,
        class_repository: ClassRepository,
        member_repository: MemberRepository,
        booking_repository: BookingRepository,
        waitlist_repository: WaitlistRepository,
        cache: RedisCache,
    ) -> None:
        self.session = session
        self.class_repository = class_repository
        self.member_repository = member_repository
        self.booking_repository = booking_repository
        self.waitlist_repository = waitlist_repository
        self.cache = cache

    async def create_booking(self, payload: BookingCreate, actor: Member) -> BookingActionResponse:
        member_id = payload.member_id or actor.id
        if member_id != actor.id and actor.role != MemberRole.ADMIN:
            raise ForbiddenError("You can only create bookings for your own account")

        booked_id: UUID | None = None
        now = datetime.now(timezone.utc)

        if self.session.in_transaction():
            await self.session.rollback()
        async with self.session.begin():
            member = await self.member_repository.get_by_id(member_id, for_update=True)
            if member is None:
                raise NotFoundError("Member not found")
            if member.membership_status != MembershipStatus.ACTIVE or not member.is_active:
                raise ConflictError("Only active members can create bookings")

            gym_class = await self.class_repository.get_by_id(payload.class_id, for_update=True)
            if gym_class is None:
                raise NotFoundError("Class not found")
            if gym_class.status != ClassStatus.SCHEDULED:
                raise ConflictError("Only scheduled classes can be booked")

            existing_booking = await self.booking_repository.get_by_member_and_class(
                member_id,
                payload.class_id,
                for_update=True,
            )
            if existing_booking is not None and existing_booking.status == BookingStatus.CONFIRMED:
                raise ConflictError("Member already has a confirmed booking for this class")

            existing_waitlist = await self.waitlist_repository.get_by_member_and_class(
                member_id,
                payload.class_id,
                for_update=True,
            )
            if existing_waitlist is not None and existing_waitlist.status == WaitlistStatus.WAITING:
                raise ConflictError("Member is already on the waitlist for this class")

            confirmed_count = await self.booking_repository.count_confirmed_for_class(payload.class_id)
            if confirmed_count < gym_class.capacity:
                booking = existing_booking or Booking(
                    member_id=member_id,
                    class_id=payload.class_id,
                    status=BookingStatus.CONFIRMED,
                    booked_at=now,
                )
                booking.status = BookingStatus.CONFIRMED
                booking.booked_at = now
                booking.cancelled_at = None
                if existing_booking is None:
                    await self.booking_repository.add(booking)
                booked_id = booking.id
            else:
                position = await self.waitlist_repository.next_position(payload.class_id)
                waitlist_entry = existing_waitlist or Waitlist(
                    member_id=member_id,
                    class_id=payload.class_id,
                    position=position,
                    status=WaitlistStatus.WAITING,
                    joined_at=now,
                )
                waitlist_entry.position = position
                waitlist_entry.status = WaitlistStatus.WAITING
                waitlist_entry.joined_at = now
                waitlist_entry.promoted_at = None
                waitlist_entry.cancelled_at = None
                if existing_waitlist is None:
                    await self.waitlist_repository.add(waitlist_entry)

        await self._invalidate_related_cache(payload.class_id, [member_id])

        if booked_id is not None:
            booking = await self.booking_repository.get_by_id(booked_id)
            assert booking is not None
            return BookingActionResponse(
                state="booked",
                message="Booking confirmed",
                booking=BookingRead.model_validate(booking),
            )

        waitlist_entry = await self.waitlist_repository.get_by_member_and_class(member_id, payload.class_id)
        assert waitlist_entry is not None
        return BookingActionResponse(
            state="waitlisted",
            message="Class is full, member added to the waitlist",
            waitlist_entry=WaitlistRead.model_validate(waitlist_entry),
        )

    async def cancel_booking(self, booking_id: UUID, actor: Member) -> BookingCancellationResponse:
        promoted_booking_id: UUID | None = None
        related_member_ids: set[UUID] = set()
        related_class_id: UUID | None = None
        actor_id = actor.id
        actor_role = actor.role

        if self.session.in_transaction():
            await self.session.rollback()
        async with self.session.begin():
            booking = await self.booking_repository.get_by_id(booking_id, for_update=True)
            if booking is None:
                raise NotFoundError("Booking not found")
            if actor_role != MemberRole.ADMIN and booking.member_id != actor_id:
                raise ForbiddenError("You can only cancel your own bookings")
            if booking.status == BookingStatus.CANCELLED:
                raise ConflictError("Booking is already cancelled")

            related_member_ids.add(booking.member_id)
            related_class_id = booking.class_id
            await self.class_repository.get_by_id(booking.class_id, for_update=True)

            now = datetime.now(timezone.utc)
            booking.status = BookingStatus.CANCELLED
            booking.cancelled_at = now

            next_waitlist_entry = await self.waitlist_repository.next_waiting_for_class(
                booking.class_id,
                for_update=True,
            )
            if next_waitlist_entry is not None:
                next_waitlist_entry.status = WaitlistStatus.PROMOTED
                next_waitlist_entry.promoted_at = now
                related_member_ids.add(next_waitlist_entry.member_id)

                promoted_booking = await self.booking_repository.get_by_member_and_class(
                    next_waitlist_entry.member_id,
                    booking.class_id,
                    for_update=True,
                )
                if promoted_booking is None:
                    promoted_booking = Booking(
                        member_id=next_waitlist_entry.member_id,
                        class_id=booking.class_id,
                        status=BookingStatus.CONFIRMED,
                        booked_at=now,
                    )
                    await self.booking_repository.add(promoted_booking)
                else:
                    promoted_booking.status = BookingStatus.CONFIRMED
                    promoted_booking.booked_at = now
                    promoted_booking.cancelled_at = None
                promoted_booking_id = promoted_booking.id

        if related_class_id is not None:
            await self._invalidate_related_cache(related_class_id, list(related_member_ids))

        promoted_schema = None
        if promoted_booking_id is not None:
            promoted_booking = await self.booking_repository.get_by_id(promoted_booking_id)
            if promoted_booking is not None:
                promoted_schema = BookingRead.model_validate(promoted_booking)

        return BookingCancellationResponse(
            booking_id=booking_id,
            cancelled=True,
            message="Booking cancelled successfully",
            promoted_booking=promoted_schema,
        )

    async def list_member_bookings(self, member_id: UUID) -> MemberBookingsResponse:
        member = await self.member_repository.get_by_id(member_id)
        if member is None:
            raise NotFoundError("Member not found")

        bookings = await self.booking_repository.list_for_member(member_id)
        waitlist_entries = await self.waitlist_repository.list_for_member(member_id)
        return MemberBookingsResponse(
            bookings=[BookingRead.model_validate(item) for item in bookings],
            waitlist=[WaitlistRead.model_validate(item) for item in waitlist_entries],
        )

    async def _invalidate_related_cache(self, class_id: UUID, member_ids: list[UUID]) -> None:
        keys = [f"class:{class_id}"]
        keys.extend(f"member:{member_id}" for member_id in member_ids)
        await self.cache.delete(*keys)
