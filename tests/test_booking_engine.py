from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock
from uuid import uuid4

from app.core.exceptions import ConflictError, DuplicateBookingError
from app.domain.enums import (
    BookingActionState,
    BookingEligibilityOutcome,
    BookingStatus,
    BookingType,
    ClassStatus,
    MemberRole,
    MembershipStatus,
    PlanPeriodType,
    SubscriptionStatus,
    WaitlistStatus,
)
from app.domain.models.booking import Booking
from app.domain.models.member_subscription import MemberSubscription
from app.domain.models.plan import Plan
from app.domain.models.waitlist import Waitlist
from app.schemas.booking_schema import BookingCreate
from app.services.booking_eligibility_service import BookingEligibilityService
from app.services.booking_service import BookingService


class _DummyTransaction:
    def __init__(self, session) -> None:
        self.session = session

    async def __aenter__(self):
        self.session._in_transaction = True
        return self.session

    async def __aexit__(self, exc_type, exc, tb) -> None:
        self.session._in_transaction = False


class _DummySession:
    def __init__(self) -> None:
        self._in_transaction = False
        self.flush = AsyncMock()
        self.new = set()
        self.dirty = set()
        self.deleted = set()

    def in_transaction(self) -> bool:
        return self._in_transaction

    def begin(self) -> _DummyTransaction:
        return _DummyTransaction(self)


class _DummyCache:
    def __init__(self) -> None:
        self.deleted_keys: list[tuple[str, ...]] = []

    async def delete(self, *keys: str) -> None:
        self.deleted_keys.append(tuple(keys))


class BookingEngineTests(IsolatedAsyncioTestCase):
    def _build_subscription(self, member_id):
        plan = Plan(
            name="Credits",
            credits_per_period=4,
            period_type=PlanPeriodType.WEEKLY,
            allows_free_pass=False,
            active=True,
        )
        subscription = MemberSubscription(
            member_id=member_id,
            plan_id=uuid4(),
            active_credits=1,
            period_start=datetime.now(timezone.utc) - timedelta(days=1),
            period_end=datetime.now(timezone.utc) + timedelta(days=6),
            status=SubscriptionStatus.ACTIVE,
        )
        subscription.plan = plan
        subscription.id = uuid4()
        return subscription

    async def test_create_booking_locks_class_before_duplicate_and_credit_checks(self) -> None:
        member_id = uuid4()
        class_id = uuid4()
        now = datetime.now(timezone.utc)
        order: list[tuple[str, bool | None]] = []
        booking_holder: dict[str, Booking] = {}
        session = _DummySession()
        cache = _DummyCache()
        member = SimpleNamespace(
            id=member_id,
            membership_status=MembershipStatus.ACTIVE,
            is_active=True,
            role=MemberRole.MEMBER,
        )
        gym_class = SimpleNamespace(
            id=class_id,
            capacity=2,
            status=ClassStatus.SCHEDULED,
            scheduled_at=now + timedelta(days=1),
        )
        subscription = self._build_subscription(member_id)

        class_repository = AsyncMock()
        class_repository.get_by_id.side_effect = lambda booking_class_id, for_update=False: (
            order.append(("class", for_update)) or gym_class
        )

        member_repository = AsyncMock()
        member_repository.get_by_id.side_effect = lambda lookup_member_id, for_update=False: (
            order.append(("member", for_update)) or member
        )

        booking_repository = AsyncMock()
        booking_repository.get_by_member_and_class.side_effect = lambda *args, **kwargs: (
            order.append(("booking", kwargs.get("for_update"))) or None
        )
        booking_repository.count_confirmed_bookings.side_effect = lambda *args, **kwargs: (
            order.append(("count_confirmed", None)) or 0
        )

        async def add_booking(booking: Booking) -> Booking:
            if getattr(booking, "id", None) is None:
                booking.id = uuid4()
            booking_holder["booking"] = booking
            return booking

        booking_repository.add.side_effect = add_booking
        booking_repository.get_by_id.side_effect = lambda booking_id, for_update=False: booking_holder.get("booking")

        waitlist_repository = AsyncMock()
        waitlist_repository.get_by_member_and_class.side_effect = lambda *args, **kwargs: (
            order.append(("waitlist", kwargs.get("for_update"))) or None
        )

        member_subscription_repository = AsyncMock()
        member_subscription_repository.get_active_for_member.side_effect = (
            lambda *args, **kwargs: order.append(("subscription", kwargs.get("for_update"))) or subscription
        )
        member_subscription_repository.get_latest_for_member = AsyncMock(return_value=None)

        eligibility_service = BookingEligibilityService(
            member_repository=member_repository,
            class_repository=class_repository,
            booking_repository=booking_repository,
            waitlist_repository=waitlist_repository,
            member_subscription_repository=member_subscription_repository,
            billing_service=SimpleNamespace(sync_billing_state=lambda *args, **kwargs: False),
        )

        subscription_service = SimpleNamespace(
            consume_credit_for_booking=lambda locked_subscription: (
                setattr(locked_subscription, "active_credits", locked_subscription.active_credits - 1)
                or order.append(("consume_credit", None))
                or (BookingType.CREDIT, 1)
            ),
        )

        service = BookingService(
            session=session,
            class_repository=class_repository,
            member_repository=member_repository,
            booking_repository=booking_repository,
            waitlist_repository=waitlist_repository,
            eligibility_service=eligibility_service,
            subscription_service=subscription_service,
            cache=cache,
        )

        result = await service.create_booking(
            BookingCreate(class_id=class_id, member_id=member_id),
            member,
        )

        self.assertEqual(
            order[:5],
            [
                ("class", True),
                ("member", False),
                ("booking", True),
                ("waitlist", True),
                ("subscription", True),
            ],
        )
        self.assertEqual(result.state, BookingActionState.BOOKING_CONFIRMED)
        self.assertEqual(result.message, "Booking confirmed")
        self.assertEqual(subscription.active_credits, 0)
        self.assertEqual(cache.deleted_keys, [(f"class:{class_id}", f"member:{member_id}")])

    async def test_duplicate_waitlist_is_reported_as_duplicate_booking(self) -> None:
        member_id = uuid4()
        class_id = uuid4()
        member = SimpleNamespace(
            id=member_id,
            membership_status=MembershipStatus.ACTIVE,
            is_active=True,
        )
        gym_class = SimpleNamespace(
            id=class_id,
            capacity=10,
            status=ClassStatus.SCHEDULED,
            scheduled_at=datetime.now(timezone.utc) + timedelta(days=1),
        )
        waitlist_entry = Waitlist(
            member_id=member_id,
            class_id=class_id,
            position=1,
            status=WaitlistStatus.WAITING,
            joined_at=datetime.now(timezone.utc),
        )

        eligibility_service = BookingEligibilityService(
            member_repository=SimpleNamespace(get_by_id=AsyncMock(return_value=member)),
            class_repository=SimpleNamespace(get_by_id=AsyncMock(return_value=gym_class)),
            booking_repository=SimpleNamespace(
                get_by_member_and_class=AsyncMock(return_value=None),
                count_confirmed_bookings=AsyncMock(return_value=0),
            ),
            waitlist_repository=SimpleNamespace(get_by_member_and_class=AsyncMock(return_value=waitlist_entry)),
            member_subscription_repository=SimpleNamespace(
                get_active_for_member=AsyncMock(return_value=None),
                get_latest_for_member=AsyncMock(return_value=None),
            ),
            billing_service=SimpleNamespace(sync_billing_state=lambda *args, **kwargs: False),
        )

        decision = await eligibility_service.validate_member_booking(member_id, class_id)

        self.assertEqual(decision.outcome, BookingEligibilityOutcome.DUPLICATE_BOOKING)
        with self.assertRaises(DuplicateBookingError):
            eligibility_service.ensure_booking_is_allowed(decision)

    async def test_waitlist_promotion_stops_at_first_ineligible_member(self) -> None:
        class_id = uuid4()
        member_id = uuid4()
        session = _DummySession()
        waitlist_entry = Waitlist(
            member_id=member_id,
            class_id=class_id,
            position=1,
            status=WaitlistStatus.WAITING,
            joined_at=datetime.now(timezone.utc),
        )

        class_repository = SimpleNamespace(
            get_by_id=AsyncMock(return_value=SimpleNamespace(id=class_id, capacity=2))
        )
        booking_repository = SimpleNamespace(
            count_confirmed_bookings=AsyncMock(return_value=0),
            add=AsyncMock(),
        )
        async def get_next_waitlist_booking(*args, **kwargs):
            excluded_ids = kwargs.get("excluded_ids") or set()
            if waitlist_entry.id in excluded_ids:
                return None
            return waitlist_entry

        waitlist_repository = SimpleNamespace(
            get_next_waitlist_booking=AsyncMock(side_effect=get_next_waitlist_booking)
        )
        eligibility_service = SimpleNamespace(
            validate_member_booking=AsyncMock(
                return_value=SimpleNamespace(
                    outcome=BookingEligibilityOutcome.INSUFFICIENT_CREDITS,
                    subscription=None,
                    existing_booking=None,
                )
            )
        )

        service = BookingService(
            session=session,
            class_repository=class_repository,
            member_repository=SimpleNamespace(),
            booking_repository=booking_repository,
            waitlist_repository=waitlist_repository,
            eligibility_service=eligibility_service,
            subscription_service=SimpleNamespace(),
            cache=_DummyCache(),
        )

        promoted_ids = await service.promote_waitlist_if_needed(class_id, related_member_ids=set())

        self.assertEqual(promoted_ids, [])
        self.assertEqual(waitlist_repository.get_next_waitlist_booking.await_count, 2)
        booking_repository.add.assert_not_awaited()

    def test_invalid_booking_status_transition_is_rejected(self) -> None:
        booking = Booking(
            member_id=uuid4(),
            class_id=uuid4(),
            booked_at=datetime.now(timezone.utc),
            status=BookingStatus.CANCELLED,
        )

        with self.assertRaises(ConflictError):
            BookingService._transition_booking_status(booking, BookingStatus.CONFIRMED)
