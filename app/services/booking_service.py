from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BookingNotCancellableError, ForbiddenError, NotFoundError
from app.domain.enums import BookingEligibilityOutcome, BookingStatus, MemberRole, WaitlistStatus
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
from app.services.booking_eligibility_service import BookingEligibilityService
from app.services.subscription_service import SubscriptionService


class BookingService:
    def __init__(
        self,
        session: AsyncSession,
        class_repository: ClassRepository,
        member_repository: MemberRepository,
        booking_repository: BookingRepository,
        waitlist_repository: WaitlistRepository,
        eligibility_service: BookingEligibilityService,
        subscription_service: SubscriptionService,
        cache: RedisCache,
    ) -> None:
        self.session = session
        self.class_repository = class_repository
        self.member_repository = member_repository
        self.booking_repository = booking_repository
        self.waitlist_repository = waitlist_repository
        self.eligibility_service = eligibility_service
        self.subscription_service = subscription_service
        self.cache = cache

    async def create_booking(
        self,
        payload: BookingCreate,
        actor: Member,
        *,
        allow_staff_override: bool = False,
    ) -> BookingActionResponse:
        member_id = payload.member_id or actor.id
        if member_id != actor.id and not (
            actor.role == MemberRole.ADMIN or (allow_staff_override and actor.role == MemberRole.INSTRUCTOR)
        ):
            raise ForbiddenError("You can only create bookings for your own account")

        booked_id: UUID | None = None
        now = datetime.now(timezone.utc)

        if self.session.in_transaction():
            await self.session.rollback()
        async with self.session.begin():
            decision = await self.eligibility_service.validate_member_booking(
                member_id,
                payload.class_id,
                reference_time=now,
                for_update=True,
            )
            self.eligibility_service.ensure_booking_is_allowed(decision)

            subscription = decision.subscription
            existing_booking = decision.existing_booking
            existing_waitlist = decision.existing_waitlist

            if decision.outcome == BookingEligibilityOutcome.BOOKING_ALLOWED:
                assert subscription is not None
                booking_type, credits_consumed = self.subscription_service.consume_credit_for_booking(
                    subscription
                )
                booking = existing_booking or Booking(
                    member_id=member_id,
                    class_id=payload.class_id,
                    booked_at=now,
                )
                booking.status = BookingStatus.CONFIRMED
                booking.booking_type = booking_type
                booking.credits_consumed = credits_consumed
                booking.subscription_id = subscription.id
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
        promoted_booking_ids: list[UUID] = []
        related_member_ids: set[UUID] = set()
        related_class_id: UUID | None = None
        credit_restored = False
        actor_id = actor.id
        actor_role = actor.role

        if self.session.in_transaction():
            await self.session.rollback()
        async with self.session.begin():
            now = datetime.now(timezone.utc)
            booking = await self.booking_repository.get_by_id(booking_id, for_update=True)
            if booking is not None:
                related_member_ids.add(booking.member_id)
                related_class_id = booking.class_id
                self._ensure_cancellation_access(actor_role, actor_id, booking.member_id)
                self._ensure_booking_cancellable(booking.status)

                gym_class = await self.class_repository.get_by_id(booking.class_id, for_update=True)
                if gym_class is None:
                    raise NotFoundError("Class not found")

                was_confirmed = booking.status == BookingStatus.CONFIRMED
                if was_confirmed and self.cancellation_is_early(gym_class.scheduled_at, reference_time=now):
                    credit_restored = await self.subscription_service.restore_credit_for_booking_cancellation(
                        booking
                    )

                booking.status = BookingStatus.CANCELLED
                booking.cancelled_at = now
                await self.session.flush()

                if was_confirmed:
                    promoted_booking_ids = await self.promote_waitlist_if_needed(
                        booking.class_id,
                        now=now,
                        related_member_ids=related_member_ids,
                    )
            else:
                waitlist_entry = await self.waitlist_repository.get_by_id(booking_id, for_update=True)
                if waitlist_entry is None:
                    raise NotFoundError("Booking not found")

                related_member_ids.add(waitlist_entry.member_id)
                related_class_id = waitlist_entry.class_id
                self._ensure_cancellation_access(actor_role, actor_id, waitlist_entry.member_id)
                self._ensure_waitlist_cancellable(waitlist_entry.status)

                gym_class = await self.class_repository.get_by_id(waitlist_entry.class_id, for_update=True)
                if gym_class is None:
                    raise NotFoundError("Class not found")

                waitlist_entry.status = WaitlistStatus.CANCELLED
                waitlist_entry.cancelled_at = now

        if related_class_id is not None:
            await self._invalidate_related_cache(related_class_id, list(related_member_ids))

        for promoted_booking_id in promoted_booking_ids:
            await self._enqueue_waitlist_notification(promoted_booking_id)

        promoted_schema = None
        if promoted_booking_ids:
            promoted_booking = await self.booking_repository.get_by_id(promoted_booking_ids[0])
            if promoted_booking is not None:
                promoted_schema = BookingRead.model_validate(promoted_booking)

        return BookingCancellationResponse(
            status="cancelled",
            credit_restored=credit_restored,
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

    async def promote_waitlist_if_needed(
        self,
        class_id: UUID,
        *,
        now: datetime | None = None,
        related_member_ids: set[UUID] | None = None,
    ) -> list[UUID]:
        if related_member_ids is None:
            related_member_ids = set()
        reference_time = now or datetime.now(timezone.utc)
        promoted_booking_ids: list[UUID] = []
        skipped_waitlist_ids: set[UUID] = set()

        gym_class = await self.class_repository.get_by_id(class_id, for_update=True)
        if gym_class is None:
            raise NotFoundError("Class not found")

        while True:
            confirmed_count = await self.booking_repository.count_confirmed_bookings(class_id)
            available_spots = max(gym_class.capacity - confirmed_count, 0)
            if available_spots <= 0:
                break

            waitlist_entry = await self.waitlist_repository.get_next_waitlist_booking(
                class_id,
                for_update=True,
                excluded_ids=skipped_waitlist_ids,
            )
            if waitlist_entry is None:
                break

            related_member_ids.add(waitlist_entry.member_id)
            decision = await self.eligibility_service.validate_member_booking(
                waitlist_entry.member_id,
                class_id,
                reference_time=reference_time,
                for_update=True,
                allow_existing_waitlist=True,
            )
            if decision.outcome != BookingEligibilityOutcome.BOOKING_ALLOWED or decision.subscription is None:
                skipped_waitlist_ids.add(waitlist_entry.id)
                continue

            booking_type, credits_consumed = self.subscription_service.consume_credit_for_booking(
                decision.subscription
            )

            waitlist_entry.status = WaitlistStatus.PROMOTED
            waitlist_entry.promoted_at = reference_time
            waitlist_entry.cancelled_at = None

            promoted_booking = await self.booking_repository.get_by_member_and_class(
                waitlist_entry.member_id,
                class_id,
                for_update=True,
            )
            if promoted_booking is None:
                promoted_booking = Booking(
                    member_id=waitlist_entry.member_id,
                    class_id=class_id,
                    booked_at=reference_time,
                )
                await self.booking_repository.add(promoted_booking)

            promoted_booking.status = BookingStatus.CONFIRMED
            promoted_booking.booking_type = booking_type
            promoted_booking.credits_consumed = credits_consumed
            promoted_booking.subscription_id = decision.subscription.id
            promoted_booking.booked_at = reference_time
            promoted_booking.cancelled_at = None
            promoted_booking_ids.append(promoted_booking.id)

        return promoted_booking_ids

    @staticmethod
    def cancellation_is_early(start_time: datetime, *, reference_time: datetime | None = None) -> bool:
        current_time = reference_time or datetime.now(timezone.utc)
        return start_time - current_time >= timedelta(hours=24)

    @staticmethod
    def _ensure_cancellation_access(actor_role: MemberRole, actor_id: UUID, owner_id: UUID) -> None:
        if actor_role == MemberRole.ADMIN:
            return
        if owner_id != actor_id:
            raise ForbiddenError("You can only cancel your own bookings")

    @staticmethod
    def _ensure_booking_cancellable(status: BookingStatus) -> None:
        if status in {BookingStatus.CONFIRMED, BookingStatus.WAITLIST}:
            return
        raise BookingNotCancellableError("Only confirmed bookings or waitlist bookings can be cancelled")

    @staticmethod
    def _ensure_waitlist_cancellable(status: WaitlistStatus) -> None:
        if status == WaitlistStatus.WAITING:
            return
        raise BookingNotCancellableError("Only confirmed bookings or active waitlist entries can be cancelled")

    async def _enqueue_waitlist_notification(self, booking_id: UUID) -> None:
        from app.workers.tasks.notifications import send_waitlist_notifications

        send_waitlist_notifications.delay(str(booking_id))

    async def _invalidate_related_cache(self, class_id: UUID, member_ids: list[UUID]) -> None:
        keys = [f"class:{class_id}"]
        keys.extend(f"member:{member_id}" for member_id in member_ids)
        await self.cache.delete(*keys)
