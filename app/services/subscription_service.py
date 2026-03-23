from calendar import monthrange
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.domain.enums import BillingStatus, BookingEligibilityOutcome, BookingType, PlanPeriodType, SubscriptionStatus
from app.domain.models.booking import Booking
from app.domain.models.member_subscription import MemberSubscription
from app.infrastructure.cache.redis_client import RedisCache
from app.repositories.member_repository import MemberRepository
from app.repositories.member_subscription_repository import MemberSubscriptionRepository
from app.repositories.plan_repository import PlanRepository
from app.schemas.subscription_schema import MemberSubscriptionRead, MemberSubscriptionStatusRead
from app.services.billing_service import BillingService


def calculate_period_end(start: datetime, period_type: PlanPeriodType) -> datetime:
    if period_type == PlanPeriodType.WEEKLY:
        return start + timedelta(days=7)

    month = start.month + 1
    year = start.year
    if month > 12:
        month = 1
        year += 1
    day = min(start.day, monthrange(year, month)[1])
    return start.replace(year=year, month=month, day=day)


def sync_subscription_period(subscription: MemberSubscription, reference_time: datetime) -> int:
    if subscription.plan is None or subscription.status != SubscriptionStatus.ACTIVE:
        return 0

    resets = 0
    while subscription.period_end <= reference_time:
        subscription.period_start = subscription.period_end
        subscription.period_end = calculate_period_end(subscription.period_start, subscription.plan.period_type)
        subscription.active_credits = 0 if subscription.is_free_pass else subscription.plan.credits_per_period
        resets += 1
    return resets


class SubscriptionService:
    def __init__(
        self,
        session: AsyncSession,
        member_repository: MemberRepository,
        plan_repository: PlanRepository,
        member_subscription_repository: MemberSubscriptionRepository,
        cache: RedisCache | None,
        billing_service: BillingService,
    ) -> None:
        self.session = session
        self.member_repository = member_repository
        self.plan_repository = plan_repository
        self.member_subscription_repository = member_subscription_repository
        self.cache = cache
        self.billing_service = billing_service

    async def get_member_subscription(self, member_id: UUID) -> MemberSubscriptionRead | None:
        member = await self.member_repository.get_by_id(member_id)
        if member is None:
            raise NotFoundError("Member not found")

        now = datetime.now(timezone.utc)
        subscription = await self.member_subscription_repository.get_active_for_member(member_id)
        if subscription is None:
            return None

        if self._subscription_needs_read_refresh(subscription, now):
            await self._sync_subscription_for_read(subscription.id, reference_time=now)
            refreshed = await self.member_subscription_repository.get_by_id(subscription.id)
            if refreshed is not None:
                subscription = refreshed

        return self._serialize_subscription(subscription, reference_time=now)

    async def get_member_subscription_status(self, member_id: UUID) -> MemberSubscriptionStatusRead:
        member = await self.member_repository.get_by_id(member_id)
        if member is None:
            raise NotFoundError("Member not found")

        now = datetime.now(timezone.utc)
        subscription = await self.member_subscription_repository.get_active_for_member(member_id)
        if subscription is not None and self._subscription_needs_read_refresh(subscription, now):
            await self._sync_subscription_for_read(subscription.id, reference_time=now)
            subscription = await self.member_subscription_repository.get_active_for_member(member_id)

        if subscription is not None and subscription.status == SubscriptionStatus.ACTIVE:
            return self._serialize_subscription_status(subscription, active_plan=True, reference_time=now)

        latest_subscription = subscription or await self.member_subscription_repository.get_latest_for_member(member_id)
        if latest_subscription is None:
            return MemberSubscriptionStatusRead(
                active_plan=False,
                active_credits=0,
                effective_credits=0,
                period_end=None,
                plan_name=None,
                allows_free_pass=False,
                status=None,
                billing_status=None,
                next_due_date=None,
                last_payment_date=None,
                suspended_at=None,
                billing_warning=None,
                error_code=BookingEligibilityOutcome.NO_ACTIVE_PLAN.value,
            )

        error_code = (
            BookingEligibilityOutcome.PLAN_EXPIRED.value
            if latest_subscription.status == SubscriptionStatus.EXPIRED or latest_subscription.period_end <= now
            else BookingEligibilityOutcome.NO_ACTIVE_PLAN.value
        )
        return MemberSubscriptionStatusRead(
            active_plan=False,
            active_credits=0,
            effective_credits=0,
            period_end=latest_subscription.period_end,
            plan_name=latest_subscription.plan.name if latest_subscription.plan is not None else None,
            allows_free_pass=latest_subscription.is_free_pass,
            status=latest_subscription.status,
            billing_status=latest_subscription.billing_status,
            next_due_date=latest_subscription.next_due_date,
            last_payment_date=latest_subscription.last_payment_date,
            suspended_at=latest_subscription.suspended_at,
            billing_warning=self.billing_service.build_warning(latest_subscription, reference_time=now),
            error_code=error_code,
        )

    async def assign_subscription(self, member_id: UUID, plan_id: UUID) -> MemberSubscriptionRead:
        now = datetime.now(timezone.utc)
        if self.session.in_transaction():
            await self.session.rollback()
        async with self.session.begin():
            member = await self.member_repository.get_by_id(member_id, for_update=True)
            if member is None:
                raise NotFoundError("Member not found")

            plan = await self.plan_repository.get_by_id(plan_id, for_update=True)
            if plan is None:
                raise NotFoundError("Plan not found")
            if not plan.active:
                raise ConflictError("Only active plans can be assigned")

            existing = await self.member_subscription_repository.get_active_for_member(member_id, for_update=True)
            if existing is not None:
                existing.status = SubscriptionStatus.CANCELLED
                existing.active_credits = 0

            period_start = now
            period_end = calculate_period_end(period_start, plan.period_type)
            subscription = MemberSubscription(
                member_id=member_id,
                plan_id=plan_id,
                active_credits=0 if plan.allows_free_pass else plan.credits_per_period,
                period_start=period_start,
                period_end=period_end,
                status=SubscriptionStatus.ACTIVE,
                billing_status=BillingStatus.ACTIVE,
                next_due_date=self.billing_service.initialize_next_due_date(now),
                last_payment_date=now,
            )
            await self.member_subscription_repository.add(subscription)

        await self._invalidate_member_cache(member_id)
        refreshed = await self.member_subscription_repository.get_by_id(subscription.id)
        assert refreshed is not None
        return self._serialize_subscription(refreshed, reference_time=now)

    async def cancel_subscription(self, member_id: UUID) -> None:
        if self.session.in_transaction():
            await self.session.rollback()
        async with self.session.begin():
            member = await self.member_repository.get_by_id(member_id, for_update=True)
            if member is None:
                raise NotFoundError("Member not found")

            subscription = await self.member_subscription_repository.get_active_for_member(member_id, for_update=True)
            if subscription is None:
                return
            subscription.status = SubscriptionStatus.CANCELLED
            subscription.active_credits = 0
        await self._invalidate_member_cache(member_id)

    async def record_successful_payment(
        self,
        member_id: UUID,
        *,
        paid_at: datetime | None = None,
    ) -> MemberSubscriptionRead:
        subscription = await self.billing_service.record_successful_payment(member_id, paid_at=paid_at)
        reference_time = paid_at or datetime.now(timezone.utc)
        return self._serialize_subscription(subscription, reference_time=reference_time)

    async def reset_due_subscriptions(self) -> int:
        now = datetime.now(timezone.utc)
        if self.session.in_transaction():
            await self.session.rollback()
        reset_count = 0
        changed_member_ids: set[UUID] = set()
        async with self.session.begin():
            due_subscriptions = await self.member_subscription_repository.list_due_for_reset(now)
            for due_subscription in due_subscriptions:
                subscription = await self.member_subscription_repository.get_by_id(due_subscription.id, for_update=True)
                if subscription is None:
                    continue
                sync_count = sync_subscription_period(subscription, now)
                if sync_count:
                    reset_count += sync_count
                    changed_member_ids.add(subscription.member_id)
        if changed_member_ids and self.cache is not None:
            await self.cache.delete(*(f"member:{member_id}" for member_id in changed_member_ids))
        return reset_count

    async def get_active_subscription_for_booking(
        self,
        member_id: UUID,
        *,
        for_update: bool = False,
        reference_time: datetime | None = None,
    ) -> MemberSubscription:
        reference_time = reference_time or datetime.now(timezone.utc)
        subscription = await self.member_subscription_repository.get_active_for_member(
            member_id,
            for_update=for_update,
        )
        if subscription is None:
            raise ConflictError("Member does not have an active subscription")

        sync_subscription_period(subscription, reference_time)
        self.billing_service.sync_billing_state(subscription, reference_time=reference_time)
        if subscription.status != SubscriptionStatus.ACTIVE:
            raise ConflictError("Member subscription is not active")
        return subscription

    def consume_credit_for_booking(self, subscription: MemberSubscription) -> tuple[BookingType, int]:
        self.billing_service.ensure_can_consume_credits(subscription)
        if subscription.plan is None:
            raise ConflictError("Subscription plan is missing")
        if subscription.is_free_pass:
            return BookingType.FREE_PASS, 0
        if subscription.active_credits <= 0:
            raise ConflictError("No credits left in the current plan period")
        subscription.active_credits -= 1
        return BookingType.CREDIT, 1

    async def restore_credit_for_booking_cancellation(self, booking: Booking) -> bool:
        if (
            booking.booking_type != BookingType.CREDIT
            or booking.credits_consumed <= 0
            or booking.subscription_id is None
        ):
            return False

        subscription = await self.member_subscription_repository.get_by_id(booking.subscription_id, for_update=True)
        if subscription is None or subscription.plan is None:
            return False

        sync_subscription_period(subscription, datetime.now(timezone.utc))
        if subscription.status != SubscriptionStatus.ACTIVE:
            return False
        if booking.booked_at < subscription.period_start:
            return False

        subscription.active_credits = min(
            subscription.plan.credits_per_period,
            subscription.active_credits + booking.credits_consumed,
        )
        return True

    async def _sync_subscription_for_read(
        self,
        subscription_id: UUID,
        *,
        reference_time: datetime | None = None,
    ) -> None:
        if self.session.in_transaction():
            await self.session.rollback()
        async with self.session.begin():
            subscription = await self.member_subscription_repository.get_by_id(subscription_id, for_update=True)
            if subscription is None:
                return
            sync_reference_time = reference_time or datetime.now(timezone.utc)
            sync_subscription_period(subscription, sync_reference_time)
            self.billing_service.sync_billing_state(subscription, reference_time=sync_reference_time)
            member_id = subscription.member_id
        await self._invalidate_member_cache(member_id)

    async def _invalidate_member_cache(self, member_id: UUID) -> None:
        if self.cache is None:
            return
        await self.cache.delete(f"member:{member_id}")

    def _subscription_needs_read_refresh(
        self,
        subscription: MemberSubscription,
        reference_time: datetime,
    ) -> bool:
        if subscription.period_end <= reference_time:
            return True
        return self.billing_service.resolve_billing_status(
            subscription,
            reference_time=reference_time,
        ) != subscription.billing_status

    def _serialize_subscription(
        self,
        subscription: MemberSubscription,
        *,
        reference_time: datetime,
    ) -> MemberSubscriptionRead:
        return MemberSubscriptionRead(
            id=subscription.id,
            member_id=subscription.member_id,
            plan_id=subscription.plan_id,
            active_credits=subscription.active_credits,
            effective_credits=self.billing_service.get_effective_credits(subscription),
            period_start=subscription.period_start,
            period_end=subscription.period_end,
            status=subscription.status,
            billing_status=subscription.billing_status,
            next_due_date=subscription.next_due_date,
            last_payment_date=subscription.last_payment_date,
            suspended_at=subscription.suspended_at,
            billing_warning=self.billing_service.build_warning(subscription, reference_time=reference_time),
            created_at=subscription.created_at,
            plan=subscription.plan,
        )

    def _serialize_subscription_status(
        self,
        subscription: MemberSubscription,
        *,
        active_plan: bool,
        reference_time: datetime,
    ) -> MemberSubscriptionStatusRead:
        return MemberSubscriptionStatusRead(
            active_plan=active_plan,
            active_credits=subscription.active_credits,
            effective_credits=self.billing_service.get_effective_credits(subscription),
            period_end=subscription.period_end,
            plan_name=subscription.plan.name if subscription.plan is not None else None,
            allows_free_pass=subscription.is_free_pass,
            status=subscription.status,
            billing_status=subscription.billing_status,
            next_due_date=subscription.next_due_date,
            last_payment_date=subscription.last_payment_date,
            suspended_at=subscription.suspended_at,
            billing_warning=self.billing_service.build_warning(subscription, reference_time=reference_time),
            error_code=None,
        )
