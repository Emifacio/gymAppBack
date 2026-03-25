from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, Mock, ANY
from uuid import uuid4

from app.core.exceptions import BookingNotCancellableError, ForbiddenError
from app.domain.enums import BookingEligibilityOutcome, BookingStatus, BookingType, ClassStatus, MemberRole, WaitlistStatus
from app.domain.models.booking import Booking
from app.domain.models.waitlist import Waitlist
from app.services.booking_eligibility_service import BookingEligibilityDecision
from app.services.booking_service import BookingService


class SessionStub:
    def __init__(self) -> None:
        self.flush = AsyncMock()
        self.rollback = AsyncMock()

    def in_transaction(self) -> bool:
        return False

    @asynccontextmanager
    async def begin(self):
        yield


class BookingServiceTests(IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.session = SessionStub()
        self.class_repository = Mock()
        self.member_repository = Mock()
        self.booking_repository = Mock()
        self.waitlist_repository = Mock()
        self.eligibility_service = Mock()
        self.subscription_service = Mock()
        self.cache = Mock()
        self.cache.delete = AsyncMock()

        self.service = BookingService(
            session=self.session,
            class_repository=self.class_repository,
            member_repository=self.member_repository,
            booking_repository=self.booking_repository,
            waitlist_repository=self.waitlist_repository,
            eligibility_service=self.eligibility_service,
            subscription_service=self.subscription_service,
            cache=self.cache,
        )
        self.service._enqueue_waitlist_notification = AsyncMock()

    def build_class(
        self,
        *,
        scheduled_at: datetime,
        status: ClassStatus = ClassStatus.SCHEDULED,
        duration_minutes: int = 60,
    ) -> SimpleNamespace:
        return SimpleNamespace(
            id=uuid4(),
            name="Morning Flow",
            description=None,
            instructor_id=None,
            instructor=None,
            scheduled_at=scheduled_at,
            duration_minutes=duration_minutes,
            capacity=10,
            location="Studio A",
            status=status,
            available_spots=4,
            waitlist_size=0,
            member_booking_status=None,
            created_at=scheduled_at - timedelta(days=7),
            updated_at=scheduled_at - timedelta(days=1),
        )

    async def test_cancel_confirmed_booking_restores_credit_and_promotes_waitlist(self) -> None:
        actor = SimpleNamespace(id=uuid4(), role=MemberRole.MEMBER)
        class_id = uuid4()
        booking_id = uuid4()
        promoted_booking_id = uuid4()
        now = datetime.now(timezone.utc)

        booking = Booking(
            id=booking_id,
            member_id=actor.id,
            class_id=class_id,
            subscription_id=uuid4(),
            status=BookingStatus.CONFIRMED,
            booking_type=BookingType.CREDIT,
            credits_consumed=1,
            booked_at=now - timedelta(days=1),
            cancelled_at=None,
        )
        promoted_booking = Booking(
            id=promoted_booking_id,
            member_id=uuid4(),
            class_id=class_id,
            subscription_id=uuid4(),
            status=BookingStatus.CONFIRMED,
            booking_type=BookingType.CREDIT,
            credits_consumed=1,
            booked_at=now,
            cancelled_at=None,
        )
        promoted_booking.gym_class = None
        gym_class = SimpleNamespace(scheduled_at=now + timedelta(days=2), capacity=10)

        self.booking_repository.get_by_id = AsyncMock(side_effect=[booking, promoted_booking])
        self.class_repository.get_by_id = AsyncMock(return_value=gym_class)
        self.subscription_service.restore_credit_for_booking_cancellation = AsyncMock(return_value=True)
        self.service.promote_waitlist_if_needed = AsyncMock(return_value=[promoted_booking_id])

        response = await self.service.cancel_booking(booking_id, actor)

        self.assertEqual(response.status, "cancelled")
        self.assertTrue(response.credit_restored)
        self.assertIsNotNone(response.promoted_booking)
        self.assertEqual(booking.status, BookingStatus.CANCELLED)
        self.subscription_service.restore_credit_for_booking_cancellation.assert_awaited_once_with(booking)
        self.service.promote_waitlist_if_needed.assert_awaited_once()
        self.service._enqueue_waitlist_notification.assert_awaited_once_with(promoted_booking_id)
        self.cache.delete.assert_awaited_once()

    async def test_cancel_member_future_bookings_cancels_upcoming_confirmed_bookings_and_waitlist(self) -> None:
        member_id = uuid4()
        now = datetime.now(timezone.utc)

        future_class = SimpleNamespace(id=uuid4(), scheduled_at=now + timedelta(days=1), capacity=10, status=ClassStatus.SCHEDULED)
        past_class = SimpleNamespace(id=uuid4(), scheduled_at=now - timedelta(days=1), capacity=10, status=ClassStatus.SCHEDULED)

        future_booking = Booking(
            id=uuid4(),
            member_id=member_id,
            class_id=future_class.id,
            status=BookingStatus.CONFIRMED,
            booking_type=BookingType.CREDIT,
            credits_consumed=1,
            booked_at=now - timedelta(days=1),
            cancelled_at=None,
        )
        future_booking.__dict__["gym_class"] = future_class

        past_booking = Booking(
            id=uuid4(),
            member_id=member_id,
            class_id=past_class.id,
            status=BookingStatus.CONFIRMED,
            booking_type=BookingType.CREDIT,
            credits_consumed=1,
            booked_at=now - timedelta(days=3),
            cancelled_at=None,
        )
        past_booking.__dict__["gym_class"] = past_class

        future_waitlist = Waitlist(
            id=uuid4(),
            member_id=member_id,
            class_id=future_class.id,
            position=1,
            status=WaitlistStatus.WAITING,
            joined_at=now - timedelta(hours=2),
            promoted_at=None,
            cancelled_at=None,
        )
        future_waitlist.__dict__["gym_class"] = future_class

        past_waitlist = Waitlist(
            id=uuid4(),
            member_id=member_id,
            class_id=past_class.id,
            position=1,
            status=WaitlistStatus.WAITING,
            joined_at=now - timedelta(days=2),
            promoted_at=None,
            cancelled_at=None,
        )
        past_waitlist.__dict__["gym_class"] = past_class

        self.booking_repository.list_for_member = AsyncMock(return_value=[future_booking, past_booking])
        self.waitlist_repository.list_for_member = AsyncMock(return_value=[future_waitlist, past_waitlist])
        self.service.cancel_booking = AsyncMock()

        await self.service.cancel_member_future_bookings(member_id)

        self.service.cancel_booking.assert_any_await(future_booking.id, ANY)
        self.service.cancel_booking.assert_any_await(future_waitlist.id, ANY)
        self.assertEqual(self.service.cancel_booking.call_count, 2)

    async def test_cancel_waitlist_entry_marks_it_cancelled_without_credit_changes(self) -> None:
        actor = SimpleNamespace(id=uuid4(), role=MemberRole.MEMBER)
        class_id = uuid4()
        waitlist_id = uuid4()
        now = datetime.now(timezone.utc)

        waitlist_entry = Waitlist(
            id=waitlist_id,
            member_id=actor.id,
            class_id=class_id,
            position=1,
            status=WaitlistStatus.WAITING,
            joined_at=now - timedelta(hours=2),
            promoted_at=None,
            cancelled_at=None,
        )
        gym_class = SimpleNamespace(scheduled_at=now + timedelta(days=2), capacity=10)

        self.booking_repository.get_by_id = AsyncMock(return_value=None)
        self.waitlist_repository.get_by_id = AsyncMock(return_value=waitlist_entry)
        self.class_repository.get_by_id = AsyncMock(return_value=gym_class)
        self.subscription_service.restore_credit_for_booking_cancellation = AsyncMock()
        self.service.promote_waitlist_if_needed = AsyncMock()

        response = await self.service.cancel_booking(waitlist_id, actor)

        self.assertEqual(response.status, "cancelled")
        self.assertFalse(response.credit_restored)
        self.assertEqual(waitlist_entry.status, WaitlistStatus.CANCELLED)
        self.subscription_service.restore_credit_for_booking_cancellation.assert_not_awaited()
        self.service.promote_waitlist_if_needed.assert_not_awaited()
        self.service._enqueue_waitlist_notification.assert_not_awaited()

    async def test_list_member_bookings_excludes_non_actionable_waitlist_entries(self) -> None:
        member_id = uuid4()
        now = datetime.now(timezone.utc)

        upcoming_class = self.build_class(
            scheduled_at=now + timedelta(hours=6),
            status=ClassStatus.SCHEDULED,
        )
        concluded_class = self.build_class(
            scheduled_at=now - timedelta(hours=3),
            status=ClassStatus.COMPLETED,
        )
        cancelled_class = self.build_class(
            scheduled_at=now + timedelta(hours=4),
            status=ClassStatus.CANCELLED,
        )
        ended_but_unfinished_class = self.build_class(
            scheduled_at=now - timedelta(hours=2),
            status=ClassStatus.SCHEDULED,
            duration_minutes=45,
        )

        booking = Booking(
            id=uuid4(),
            member_id=member_id,
            class_id=upcoming_class.id,
            status=BookingStatus.CONFIRMED,
            booking_type=BookingType.CREDIT,
            credits_consumed=1,
            booked_at=now - timedelta(days=1),
            cancelled_at=None,
        )
        booking.__dict__["gym_class"] = upcoming_class

        upcoming_waitlist = Waitlist(
            id=uuid4(),
            member_id=member_id,
            class_id=upcoming_class.id,
            position=1,
            status=WaitlistStatus.WAITING,
            joined_at=now - timedelta(hours=1),
            promoted_at=None,
            cancelled_at=None,
        )
        upcoming_waitlist.__dict__["gym_class"] = upcoming_class

        concluded_waitlist = Waitlist(
            id=uuid4(),
            member_id=member_id,
            class_id=concluded_class.id,
            position=2,
            status=WaitlistStatus.WAITING,
            joined_at=now - timedelta(hours=2),
            promoted_at=None,
            cancelled_at=None,
        )
        concluded_waitlist.__dict__["gym_class"] = concluded_class

        cancelled_waitlist = Waitlist(
            id=uuid4(),
            member_id=member_id,
            class_id=cancelled_class.id,
            position=3,
            status=WaitlistStatus.WAITING,
            joined_at=now - timedelta(hours=3),
            promoted_at=None,
            cancelled_at=None,
        )
        cancelled_waitlist.__dict__["gym_class"] = cancelled_class

        ended_waitlist = Waitlist(
            id=uuid4(),
            member_id=member_id,
            class_id=ended_but_unfinished_class.id,
            position=4,
            status=WaitlistStatus.WAITING,
            joined_at=now - timedelta(hours=4),
            promoted_at=None,
            cancelled_at=None,
        )
        ended_waitlist.__dict__["gym_class"] = ended_but_unfinished_class

        self.member_repository.get_by_id = AsyncMock(return_value=SimpleNamespace(id=member_id))
        self.booking_repository.list_for_member = AsyncMock(return_value=[booking])
        self.waitlist_repository.list_for_member = AsyncMock(
            return_value=[
                upcoming_waitlist,
                concluded_waitlist,
                cancelled_waitlist,
                ended_waitlist,
            ]
        )

        response = await self.service.list_member_bookings(member_id)

        self.assertEqual(len(response.bookings), 1)
        self.assertEqual(len(response.waitlist), 1)
        self.assertEqual(response.waitlist[0].id, upcoming_waitlist.id)

    def test_cancellation_is_early_boundary(self) -> None:
        now = datetime.now(timezone.utc)
        self.assertTrue(BookingService.cancellation_is_early(now + timedelta(hours=24)))
        self.assertFalse(BookingService.cancellation_is_early(now + timedelta(hours=23, minutes=59)))
        self.assertFalse(BookingService.cancellation_is_early(now - timedelta(hours=1)))

    async def test_cancel_booking_rejects_non_cancellable_statuses(self) -> None:
        actor = SimpleNamespace(id=uuid4(), role=MemberRole.MEMBER)
        booking = Booking(
            id=uuid4(),
            member_id=actor.id,
            class_id=uuid4(),
            status=BookingStatus.ATTENDED,
            booking_type=BookingType.CREDIT,
            credits_consumed=1,
            booked_at=datetime.now(timezone.utc),
            cancelled_at=None,
        )

        self.booking_repository.get_by_id = AsyncMock(return_value=booking)

        with self.assertRaises(BookingNotCancellableError):
            await self.service.cancel_booking(booking.id, actor)

    async def test_cancel_booking_idempotent_already_cancelled(self) -> None:
        actor = SimpleNamespace(id=uuid4(), role=MemberRole.MEMBER)
        booking_id = uuid4()
        booking = Booking(
            id=booking_id,
            member_id=actor.id,
            class_id=uuid4(),
            status=BookingStatus.CANCELLED,
            booking_type=BookingType.CREDIT,
            credits_consumed=1,
            booked_at=datetime.now(timezone.utc),
            cancelled_at=datetime.now(timezone.utc),
        )

        self.booking_repository.get_by_id = AsyncMock(return_value=booking)

        response = await self.service.cancel_booking(booking_id, actor)

        self.assertEqual(response.status, "cancelled")
        self.assertFalse(response.credit_restored)
        self.assertIsNone(response.promoted_booking)

    async def test_cancel_booking_without_subscription_is_safe(self) -> None:
        actor = SimpleNamespace(id=uuid4(), role=MemberRole.MEMBER)
        class_id = uuid4()
        booking_id = uuid4()
        now = datetime.now(timezone.utc)

        booking = Booking(
            id=booking_id,
            member_id=actor.id,
            class_id=class_id,
            subscription_id=None,
            status=BookingStatus.CONFIRMED,
            booking_type=BookingType.CREDIT,
            credits_consumed=1,
            booked_at=now - timedelta(days=1),
            cancelled_at=None,
        )
        gym_class = SimpleNamespace(scheduled_at=now + timedelta(days=2), capacity=10)

        self.booking_repository.get_by_id = AsyncMock(return_value=booking)
        self.class_repository.get_by_id = AsyncMock(return_value=gym_class)
        self.subscription_service.restore_credit_for_booking_cancellation = AsyncMock(return_value=False)
        self.service.promote_waitlist_if_needed = AsyncMock(return_value=[])

        response = await self.service.cancel_booking(booking_id, actor)

        self.assertEqual(response.status, "cancelled")
        self.assertFalse(response.credit_restored)
        self.assertIsNone(response.promoted_booking)

    async def test_cancel_booking_unauthorized_user_denied(self) -> None:
        owner = SimpleNamespace(id=uuid4(), role=MemberRole.MEMBER)
        actor = SimpleNamespace(id=uuid4(), role=MemberRole.MEMBER)
        now = datetime.now(timezone.utc)
        booking = Booking(
            id=uuid4(),
            member_id=owner.id,
            class_id=uuid4(),
            status=BookingStatus.CONFIRMED,
            booking_type=BookingType.CREDIT,
            credits_consumed=1,
            booked_at=now - timedelta(days=1),
            cancelled_at=None,
        )

        self.booking_repository.get_by_id = AsyncMock(return_value=booking)

        with self.assertRaises(ForbiddenError):
            await self.service.cancel_booking(booking.id, actor)

    async def test_cancel_waitlist_idempotent_already_cancelled(self) -> None:
        actor = SimpleNamespace(id=uuid4(), role=MemberRole.MEMBER)
        waitlist_id = uuid4()
        waitlist_entry = Waitlist(
            id=waitlist_id,
            member_id=actor.id,
            class_id=uuid4(),
            position=1,
            status=WaitlistStatus.CANCELLED,
            joined_at=datetime.now(timezone.utc),
            promoted_at=None,
            cancelled_at=datetime.now(timezone.utc),
        )

        self.booking_repository.get_by_id = AsyncMock(return_value=None)
        self.waitlist_repository.get_by_id = AsyncMock(return_value=waitlist_entry)

        response = await self.service.cancel_booking(waitlist_id, actor)

        self.assertEqual(response.status, "cancelled")
        self.assertFalse(response.credit_restored)
        self.assertIsNone(response.promoted_booking)

    async def test_promote_waitlist_if_needed_skips_ineligible_members_and_promotes_next(self) -> None:
        class_id = uuid4()
        now = datetime.now(timezone.utc)
        skipped_entry = Waitlist(
            id=uuid4(),
            member_id=uuid4(),
            class_id=class_id,
            position=1,
            status=WaitlistStatus.WAITING,
            joined_at=now - timedelta(minutes=10),
            promoted_at=None,
            cancelled_at=None,
        )
        promoted_entry = Waitlist(
            id=uuid4(),
            member_id=uuid4(),
            class_id=class_id,
            position=2,
            status=WaitlistStatus.WAITING,
            joined_at=now - timedelta(minutes=5),
            promoted_at=None,
            cancelled_at=None,
        )
        gym_class = SimpleNamespace(id=class_id, capacity=2)
        skipped_decision = BookingEligibilityDecision(
            outcome=BookingEligibilityOutcome.INSUFFICIENT_CREDITS,
            member=SimpleNamespace(id=skipped_entry.member_id),
            gym_class=gym_class,
            subscription=None,
        )
        eligible_subscription = SimpleNamespace(id=uuid4())
        promoted_decision = BookingEligibilityDecision(
            outcome=BookingEligibilityOutcome.BOOKING_ALLOWED,
            member=SimpleNamespace(id=promoted_entry.member_id),
            gym_class=gym_class,
            subscription=eligible_subscription,
        )
        promoted_booking = Booking(
            id=uuid4(),
            member_id=promoted_entry.member_id,
            class_id=class_id,
            status=BookingStatus.CANCELLED,
            booking_type=BookingType.CREDIT,
            credits_consumed=0,
            booked_at=now - timedelta(days=1),
            cancelled_at=now - timedelta(hours=1),
        )

        self.class_repository.get_by_id = AsyncMock(return_value=gym_class)
        self.booking_repository.count_confirmed_bookings = AsyncMock(side_effect=[1, 1, 2])
        self.waitlist_repository.get_next_waitlist_booking = AsyncMock(
            side_effect=[skipped_entry, promoted_entry]
        )
        self.eligibility_service.validate_member_booking = AsyncMock(
            side_effect=[skipped_decision, promoted_decision]
        )
        self.subscription_service.consume_credit_for_booking = Mock(return_value=(BookingType.CREDIT, 1))
        self.booking_repository.get_by_member_and_class = AsyncMock(return_value=promoted_booking)

        promoted_ids = await self.service.promote_waitlist_if_needed(class_id, now=now)

        self.assertEqual(promoted_ids, [promoted_booking.id])
        self.assertEqual(skipped_entry.status, WaitlistStatus.WAITING)
        self.assertEqual(promoted_entry.status, WaitlistStatus.PROMOTED)
        self.assertEqual(promoted_booking.status, BookingStatus.CONFIRMED)
        self.assertEqual(promoted_booking.credits_consumed, 1)
