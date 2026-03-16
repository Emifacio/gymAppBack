from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
import inspect
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BookingNotCancellableError, ConflictError, ForbiddenError, NotFoundError
from app.domain.enums import (
    BookingActionState,
    BookingEligibilityOutcome,
    BookingStatus,
    MemberRole,
    WaitlistStatus,
)
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

_VALID_BOOKING_STATUS_TRANSITIONS: dict[BookingStatus, set[BookingStatus]] = {
    BookingStatus.WAITLIST: {BookingStatus.CONFIRMED, BookingStatus.CANCELLED},
    BookingStatus.CONFIRMED: {
        BookingStatus.CANCELLED,
        BookingStatus.ATTENDED,
        BookingStatus.NO_SHOW,
    },
    BookingStatus.CANCELLED: set(),
    BookingStatus.ATTENDED: set(),
    BookingStatus.NO_SHOW: set(),
}

_VALID_WAITLIST_STATUS_TRANSITIONS: dict[WaitlistStatus, set[WaitlistStatus]] = {
    WaitlistStatus.WAITING: {WaitlistStatus.PROMOTED, WaitlistStatus.CANCELLED},
    WaitlistStatus.PROMOTED: set(),
    WaitlistStatus.CANCELLED: set(),
}


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
        waitlist_id: UUID | None = None
        now = datetime.now(timezone.utc)

        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"booking_start member_id={member_id} class_id={payload.class_id} session_id={id(self.session)}")

        # Helper to check if object is in session
        def check_session_state(obj, name):
            if obj is None: return
            is_new = obj in self.session.new
            is_dirty = obj in self.session.dirty
            is_deleted = obj in self.session.deleted
            logger.debug(f"object_state name={name} id={getattr(obj, 'id', 'N/A')} new={is_new} dirty={is_dirty} deleted={is_deleted}")

        # If already in a transaction, we MUST rollback before calling begin()
        # to avoid 'InvalidRequestError: A transaction is already begun on this session'
        if self.session.in_transaction():
            logger.warning(f"session_already_in_transaction session_id={id(self.session)} - rolling back")
            await self.session.rollback()

        async with self.session.begin():
            locked_class = await self.class_repository.get_by_id(payload.class_id, for_update=True)
            if locked_class is None:
                raise NotFoundError("Class not found")

            decision = await self.eligibility_service.validate_member_booking(
                member_id,
                payload.class_id,
                reference_time=now,
                for_update=True,
                locked_class=locked_class,
                lock_member=False,
            )
            self.eligibility_service.ensure_booking_is_allowed(decision)

            subscription = decision.subscription
            existing_booking = decision.existing_booking
            existing_waitlist = decision.existing_waitlist

            if decision.outcome == BookingEligibilityOutcome.BOOKING_ALLOWED:
                assert subscription is not None
                booking = await self._upsert_confirmed_booking(
                    member_id=member_id,
                    class_id=payload.class_id,
                    reference_time=now,
                    subscription=subscription,
                    existing_booking=existing_booking,
                )
                booked_id = booking.id
                check_session_state(booking, "booking")
                logger.info(f"booking_created booking_id={booked_id} member_id={member_id} credits_consumed={booking.credits_consumed}")
            else:
                waitlist_entry = await self._upsert_waitlist_entry(
                    member_id=member_id,
                    class_id=payload.class_id,
                    reference_time=now,
                    existing_waitlist=existing_waitlist,
                )
                waitlist_id = waitlist_entry.id
                check_session_state(waitlist_entry, "waitlist_entry")
                logger.info(f"waitlist_added waitlist_id={waitlist_id} member_id={member_id}")

            await self.session.flush()
            logger.debug(f"session_flushed session_id={id(self.session)}")
        
        logger.info(f"transaction_closed member_id={member_id} class_id={payload.class_id} session_id={id(self.session)}")

        await self._invalidate_related_cache(payload.class_id, [member_id])

        if booked_id is not None:
            booking = await self.booking_repository.get_by_id(booked_id)
            assert booking is not None
            return BookingActionResponse(
                state=BookingActionState.BOOKING_CONFIRMED,
                message="Booking confirmed",
                booking=BookingRead.model_validate(booking),
            )

        if waitlist_id is not None:
            waitlist_entry = await self.waitlist_repository.get_by_id(waitlist_id)
        else:
            waitlist_entry = await self.waitlist_repository.get_by_member_and_class(member_id, payload.class_id)
        assert waitlist_entry is not None
        return BookingActionResponse(
            state=BookingActionState.ADDED_TO_WAITLIST,
            message="Added to waitlist",
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
            booking = await self.booking_repository.get_by_id(booking_id)
            if booking is not None:
                booking_member_id = booking.member_id
                booking_class_id = booking.class_id
                booking_status = booking.status
                self._ensure_cancellation_access(actor_role, actor_id, booking_member_id)
                self._ensure_booking_cancellable(booking_status)

                gym_class = await self.class_repository.get_by_id(booking_class_id, for_update=True)
                if gym_class is None:
                    raise NotFoundError("Class not found")

                related_member_ids.add(booking.member_id)
                related_class_id = booking.class_id

                was_confirmed = booking.status == BookingStatus.CONFIRMED
                if was_confirmed and self.cancellation_is_early(gym_class.scheduled_at, reference_time=now):
                    credit_restored = await self.subscription_service.restore_credit_for_booking_cancellation(
                        booking
                    )

                self._transition_booking_status(booking, BookingStatus.CANCELLED)
                booking.cancelled_at = now
                await self.session.flush()

                if was_confirmed:
                    promoted_booking_ids = await self.promote_waitlist_if_needed(
                        booking.class_id,
                        now=now,
                        related_member_ids=related_member_ids,
                    )
            else:
                waitlist_entry = await self.waitlist_repository.get_by_id(booking_id)
                if waitlist_entry is None:
                    raise NotFoundError("Booking not found")

                waitlist_member_id = waitlist_entry.member_id
                waitlist_class_id = waitlist_entry.class_id
                waitlist_status = waitlist_entry.status
                self._ensure_cancellation_access(actor_role, actor_id, waitlist_member_id)
                self._ensure_waitlist_cancellable(waitlist_status)

                gym_class = await self.class_repository.get_by_id(waitlist_class_id, for_update=True)
                if gym_class is None:
                    raise NotFoundError("Class not found")

                related_member_ids.add(waitlist_entry.member_id)
                related_class_id = waitlist_entry.class_id

                self._transition_waitlist_status(waitlist_entry, WaitlistStatus.CANCELLED)
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
            if confirmed_count >= gym_class.capacity:
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
                locked_class=gym_class,
                lock_member=False,
            )

            if decision.existing_booking is not None and decision.existing_booking.status == BookingStatus.CONFIRMED:
                self._transition_waitlist_status(waitlist_entry, WaitlistStatus.CANCELLED)
                waitlist_entry.cancelled_at = reference_time
                continue

            if decision.outcome != BookingEligibilityOutcome.BOOKING_ALLOWED or decision.subscription is None:
                skipped_waitlist_ids.add(waitlist_entry.id)
                continue

            existing_booking = decision.existing_booking
            if existing_booking is None:
                existing_booking = await self.booking_repository.get_by_member_and_class(
                    waitlist_entry.member_id,
                    class_id,
                    for_update=True,
                )

            promoted_booking = await self._upsert_confirmed_booking(
                member_id=waitlist_entry.member_id,
                class_id=class_id,
                reference_time=reference_time,
                subscription=decision.subscription,
                existing_booking=existing_booking,
            )

            self._transition_waitlist_status(waitlist_entry, WaitlistStatus.PROMOTED)
            waitlist_entry.promoted_at = reference_time
            waitlist_entry.cancelled_at = None

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

    @staticmethod
    async def _await_if_needed(result):
        if inspect.isawaitable(result):
            return await result
        return result

    async def _upsert_confirmed_booking(
        self,
        *,
        member_id: UUID,
        class_id: UUID,
        reference_time: datetime,
        subscription,
        existing_booking: Booking | None,
    ) -> Booking:
        booking_type, credits_consumed = self.subscription_service.consume_credit_for_booking(subscription)
        booking = existing_booking
        if booking is None:
            booking = Booking(
                member_id=member_id,
                class_id=class_id,
                booked_at=reference_time,
                status=BookingStatus.CONFIRMED,
            )
            if getattr(booking, "id", None) is None:
                booking.id = uuid4()
            await self._await_if_needed(self.booking_repository.add(booking))
        elif booking.status == BookingStatus.WAITLIST:
            self._transition_booking_status(booking, BookingStatus.CONFIRMED)
        else:
            # The schema keeps one booking row per member/class, so re-booking reuses the historical row.
            booking.status = BookingStatus.CONFIRMED

        booking.booking_type = booking_type
        booking.credits_consumed = credits_consumed
        booking.subscription_id = subscription.id
        booking.booked_at = reference_time
        booking.cancelled_at = None
        return booking

    async def _upsert_waitlist_entry(
        self,
        *,
        member_id: UUID,
        class_id: UUID,
        reference_time: datetime,
        existing_waitlist: Waitlist | None,
    ) -> Waitlist:
        position = await self.waitlist_repository.next_position(class_id)
        waitlist_entry = existing_waitlist
        if waitlist_entry is None:
            waitlist_entry = Waitlist(
                member_id=member_id,
                class_id=class_id,
                position=position,
                status=WaitlistStatus.WAITING,
                joined_at=reference_time,
            )
            if getattr(waitlist_entry, "id", None) is None:
                waitlist_entry.id = uuid4()
            await self._await_if_needed(self.waitlist_repository.add(waitlist_entry))
        else:
            # Reuse the waitlist row to preserve the per-member/per-class uniqueness constraint.
            waitlist_entry.position = position
            waitlist_entry.status = WaitlistStatus.WAITING
            waitlist_entry.joined_at = reference_time

        waitlist_entry.promoted_at = None
        waitlist_entry.cancelled_at = None
        return waitlist_entry

    @staticmethod
    def _transition_booking_status(booking: Booking, next_status: BookingStatus) -> None:
        if booking.status == next_status:
            return
        allowed_statuses = _VALID_BOOKING_STATUS_TRANSITIONS.get(booking.status, set())
        if next_status not in allowed_statuses:
            raise ConflictError(
                f"Invalid booking status transition from {booking.status.value} to {next_status.value}"
            )
        booking.status = next_status

    @staticmethod
    def _transition_waitlist_status(waitlist_entry: Waitlist, next_status: WaitlistStatus) -> None:
        if waitlist_entry.status == next_status:
            return
        allowed_statuses = _VALID_WAITLIST_STATUS_TRANSITIONS.get(waitlist_entry.status, set())
        if next_status not in allowed_statuses:
            raise ConflictError(
                "Invalid waitlist status transition "
                f"from {waitlist_entry.status.value} to {next_status.value}"
            )
        waitlist_entry.status = next_status

    async def _enqueue_waitlist_notification(self, booking_id: UUID) -> None:
        from app.workers.tasks.notifications import send_waitlist_notifications

        send_waitlist_notifications.delay(str(booking_id))

    async def _invalidate_related_cache(self, class_id: UUID, member_ids: list[UUID]) -> None:
        keys = [f"class:{class_id}"]
        keys.extend(f"member:{member_id}" for member_id in member_ids)
        await self.cache.delete(*keys)
