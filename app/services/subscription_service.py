from calendar import monthrange
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.domain.enums import BookingType, PlanPeriodType, SubscriptionStatus
from app.domain.models.booking import Booking
from app.domain.models.member_subscription import MemberSubscription
from app.infrastructure.cache.redis_client import RedisCache
from app.repositories.member_repository import MemberRepository
from app.repositories.member_subscription_repository import MemberSubscriptionRepository
from app.repositories.plan_repository import PlanRepository
from app.schemas.subscription_schema import MemberSubscriptionRead


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
    ) -> None:
        self.session = session
        self.member_repository = member_repository
        self.plan_repository = plan_repository
        self.member_subscription_repository = member_subscription_repository
        self.cache = cache

    async def get_member_subscription(self, member_id: UUID) -> MemberSubscriptionRead:
        member = await self.member_repository.get_by_id(member_id)
        if member is None:
            raise NotFoundError("Member not found")

        subscription = await self.member_subscription_repository.get_active_for_member(member_id)
        if subscription is None:
            subscription = await self.member_subscription_repository.get_latest_for_member(member_id)
        if subscription is None:
            raise NotFoundError("Subscription not found")

        if subscription.status == SubscriptionStatus.ACTIVE and subscription.period_end <= datetime.now(timezone.utc):
            await self._sync_subscription_for_read(subscription.id)
            refreshed = await self.member_subscription_repository.get_by_id(subscription.id)
            if refreshed is not None:
                subscription = refreshed

        return MemberSubscriptionRead.model_validate(subscription)

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

            period_start = now
            period_end = calculate_period_end(period_start, plan.period_type)
            subscription = MemberSubscription(
                member_id=member_id,
                plan_id=plan_id,
                active_credits=0 if plan.allows_free_pass else plan.credits_per_period,
                period_start=period_start,
                period_end=period_end,
                status=SubscriptionStatus.ACTIVE,
            )
            await self.member_subscription_repository.add(subscription)

        await self._invalidate_member_cache(member_id)
        refreshed = await self.member_subscription_repository.get_by_id(subscription.id)
        assert refreshed is not None
        return MemberSubscriptionRead.model_validate(refreshed)

    async def cancel_subscription(self, member_id: UUID) -> None:
        if self.session.in_transaction():
            await self.session.rollback()
        async with self.session.begin():
            member = await self.member_repository.get_by_id(member_id, for_update=True)
            if member is None:
                raise NotFoundError("Member not found")

            subscription = await self.member_subscription_repository.get_active_for_member(member_id, for_update=True)
            if subscription is None:
                raise NotFoundError("Active subscription not found")
            subscription.status = SubscriptionStatus.CANCELLED
        await self._invalidate_member_cache(member_id)

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
        if subscription.status != SubscriptionStatus.ACTIVE:
            raise ConflictError("Member subscription is not active")
        return subscription

    def consume_credit_for_booking(self, subscription: MemberSubscription) -> tuple[BookingType, int]:
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

    async def _sync_subscription_for_read(self, subscription_id: UUID) -> None:
        if self.session.in_transaction():
            await self.session.rollback()
        async with self.session.begin():
            subscription = await self.member_subscription_repository.get_by_id(subscription_id, for_update=True)
            if subscription is None:
                return
            sync_subscription_period(subscription, datetime.now(timezone.utc))
            member_id = subscription.member_id
        await self._invalidate_member_cache(member_id)

    async def _invalidate_member_cache(self, member_id: UUID) -> None:
        if self.cache is None:
            return
        await self.cache.delete(f"member:{member_id}")
