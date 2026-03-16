from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from app.core.exceptions import (
    BookingNotAllowedError,
    ClassFullError,
    DuplicateBookingError,
    InsufficientCreditsError,
    NoActivePlanError,
    NotFoundError,
    PlanExpiredError,
)
from app.domain.enums import (
    BookingEligibilityOutcome,
    BookingStatus,
    ClassStatus,
    MembershipStatus,
    SubscriptionStatus,
    WaitlistStatus,
)
from app.domain.models.booking import Booking
from app.domain.models.gym_class import GymClass
from app.domain.models.member import Member
from app.domain.models.member_subscription import MemberSubscription
from app.domain.models.waitlist import Waitlist
from app.repositories.booking_repository import BookingRepository
from app.repositories.class_repository import ClassRepository
from app.repositories.member_repository import MemberRepository
from app.repositories.member_subscription_repository import MemberSubscriptionRepository
from app.repositories.waitlist_repository import WaitlistRepository
from app.services.subscription_service import sync_subscription_period


@dataclass(slots=True)
class BookingEligibilityDecision:
    outcome: BookingEligibilityOutcome
    member: Member
    gym_class: GymClass
    subscription: MemberSubscription | None = None
    existing_booking: Booking | None = None
    existing_waitlist: Waitlist | None = None
    message: str | None = None


class BookingEligibilityService:
    def __init__(
        self,
        member_repository: MemberRepository,
        class_repository: ClassRepository,
        booking_repository: BookingRepository,
        waitlist_repository: WaitlistRepository,
        member_subscription_repository: MemberSubscriptionRepository,
    ) -> None:
        self.member_repository = member_repository
        self.class_repository = class_repository
        self.booking_repository = booking_repository
        self.waitlist_repository = waitlist_repository
        self.member_subscription_repository = member_subscription_repository

    async def validate_member_booking(
        self,
        member_id: UUID,
        class_id: UUID,
        *,
        reference_time: datetime | None = None,
        for_update: bool = False,
        allow_existing_waitlist: bool = False,
        locked_class: GymClass | None = None,
        lock_member: bool | None = None,
    ) -> BookingEligibilityDecision:
        now = reference_time or datetime.now(timezone.utc)
        if lock_member is None:
            lock_member = for_update and locked_class is None

        member = await self.member_repository.get_by_id(member_id, for_update=lock_member)
        if member is None:
            raise NotFoundError("Member not found")

        gym_class = locked_class or await self.class_repository.get_by_id(class_id, for_update=for_update)
        if gym_class is None:
            raise NotFoundError("Class not found")

        if member.membership_status != MembershipStatus.ACTIVE or not member.is_active:
            return BookingEligibilityDecision(
                outcome=BookingEligibilityOutcome.BOOKING_NOT_ALLOWED,
                member=member,
                gym_class=gym_class,
                message="Only active members can create bookings",
            )

        if gym_class.status != ClassStatus.SCHEDULED:
            return BookingEligibilityDecision(
                outcome=BookingEligibilityOutcome.BOOKING_NOT_ALLOWED,
                member=member,
                gym_class=gym_class,
                message="Only scheduled classes can be booked",
            )

        existing_booking = await self.booking_repository.get_by_member_and_class(
            member_id,
            class_id,
            for_update=for_update,
        )
        if existing_booking is not None and existing_booking.status in {
            BookingStatus.CONFIRMED,
            BookingStatus.WAITLIST,
        }:
            return BookingEligibilityDecision(
                outcome=BookingEligibilityOutcome.DUPLICATE_BOOKING,
                member=member,
                gym_class=gym_class,
                existing_booking=existing_booking,
                message="Member already has a booking for this class",
            )

        existing_waitlist = await self.waitlist_repository.get_by_member_and_class(
            member_id,
            class_id,
            for_update=for_update,
        )
        if (
            not allow_existing_waitlist
            and existing_waitlist is not None
            and existing_waitlist.status == WaitlistStatus.WAITING
        ):
            return BookingEligibilityDecision(
                outcome=BookingEligibilityOutcome.DUPLICATE_BOOKING,
                member=member,
                gym_class=gym_class,
                existing_waitlist=existing_waitlist,
                message="Member is already on the waitlist for this class",
            )

        subscription = await self.member_subscription_repository.get_active_for_member(
            member_id,
            for_update=for_update,
        )
        if subscription is None:
            latest_subscription = await self.member_subscription_repository.get_latest_for_member(member_id)
            outcome = (
                BookingEligibilityOutcome.PLAN_EXPIRED
                if latest_subscription is not None and self._is_subscription_expired(latest_subscription, now)
                else BookingEligibilityOutcome.NO_ACTIVE_PLAN
            )
            message = (
                "Member plan has expired"
                if outcome == BookingEligibilityOutcome.PLAN_EXPIRED
                else "Member has no active plan assigned"
            )
            return BookingEligibilityDecision(
                outcome=outcome,
                member=member,
                gym_class=gym_class,
                subscription=latest_subscription,
                existing_booking=existing_booking,
                existing_waitlist=existing_waitlist,
                message=message,
            )

        sync_subscription_period(subscription, now)
        if subscription.status != SubscriptionStatus.ACTIVE:
            return BookingEligibilityDecision(
                outcome=BookingEligibilityOutcome.PLAN_EXPIRED,
                member=member,
                gym_class=gym_class,
                subscription=subscription,
                existing_booking=existing_booking,
                existing_waitlist=existing_waitlist,
                message="Member plan has expired",
            )

        if subscription.plan is None:
            return BookingEligibilityDecision(
                outcome=BookingEligibilityOutcome.NO_ACTIVE_PLAN,
                member=member,
                gym_class=gym_class,
                subscription=subscription,
                existing_booking=existing_booking,
                existing_waitlist=existing_waitlist,
                message="Member has no active plan assigned",
            )

        if not subscription.plan.allows_free_pass and subscription.plan.credits_per_period > 0:
            if subscription.active_credits <= 0:
                return BookingEligibilityDecision(
                    outcome=BookingEligibilityOutcome.INSUFFICIENT_CREDITS,
                    member=member,
                    gym_class=gym_class,
                    subscription=subscription,
                    existing_booking=existing_booking,
                    existing_waitlist=existing_waitlist,
                    message="Not enough credits",
                )

        confirmed_count = await self.booking_repository.count_confirmed_bookings(class_id)
        if confirmed_count >= gym_class.capacity:
            return BookingEligibilityDecision(
                outcome=BookingEligibilityOutcome.WAITLIST_ALLOWED,
                member=member,
                gym_class=gym_class,
                subscription=subscription,
                existing_booking=existing_booking,
                existing_waitlist=existing_waitlist,
            )

        return BookingEligibilityDecision(
            outcome=BookingEligibilityOutcome.BOOKING_ALLOWED,
            member=member,
            gym_class=gym_class,
            subscription=subscription,
            existing_booking=existing_booking,
            existing_waitlist=existing_waitlist,
        )

    def ensure_booking_is_allowed(self, decision: BookingEligibilityDecision) -> None:
        if decision.outcome in {
            BookingEligibilityOutcome.BOOKING_ALLOWED,
            BookingEligibilityOutcome.WAITLIST_ALLOWED,
        }:
            return
        if decision.outcome == BookingEligibilityOutcome.NO_ACTIVE_PLAN:
            raise NoActivePlanError(decision.message or "Member has no active plan assigned")
        if decision.outcome == BookingEligibilityOutcome.PLAN_EXPIRED:
            raise PlanExpiredError(decision.message or "Member plan has expired")
        if decision.outcome == BookingEligibilityOutcome.INSUFFICIENT_CREDITS:
            raise InsufficientCreditsError(decision.message or "Not enough credits")
        if decision.outcome == BookingEligibilityOutcome.CLASS_FULL:
            raise ClassFullError(decision.message or "Class is full")
        if decision.outcome == BookingEligibilityOutcome.DUPLICATE_BOOKING:
            raise DuplicateBookingError(decision.message or "Member is already booked for this class")
        raise BookingNotAllowedError(decision.message or "Booking is not allowed")

    @staticmethod
    def _is_subscription_expired(subscription: MemberSubscription, reference_time: datetime) -> bool:
        return subscription.status == SubscriptionStatus.EXPIRED or subscription.period_end <= reference_time
