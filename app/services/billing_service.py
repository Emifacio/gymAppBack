from __future__ import annotations

from calendar import monthrange
from dataclasses import dataclass
from datetime import date, datetime, timezone
import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BillingSuspendedError, ConflictError
from app.domain.enums import BillingReminderStage, BillingStatus, SubscriptionStatus
from app.domain.models.member_subscription import MemberSubscription
from app.infrastructure.cache.redis_client import RedisCache
from app.repositories.member_subscription_repository import MemberSubscriptionRepository
from app.schemas.subscription_schema import BillingWarningRead
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class BillingReminderEvent:
    member_id: UUID
    member_email: str
    member_name: str
    plan_name: str | None
    stage: BillingReminderStage
    due_date: date


@dataclass(slots=True)
class BillingRunSummary:
    checked_subscriptions: int = 0
    reminders_sent: int = 0
    suspended_accounts: int = 0


class BillingService:
    def __init__(
        self,
        session: AsyncSession,
        member_subscription_repository: MemberSubscriptionRepository,
        cache: RedisCache | None,
        email_service: EmailService | None = None,
    ) -> None:
        self.session = session
        self.member_subscription_repository = member_subscription_repository
        self.cache = cache
        self.email_service = email_service or EmailService()

    @staticmethod
    def get_reference_time(reference_time: datetime | None = None) -> datetime:
        return reference_time or datetime.now(timezone.utc)

    @staticmethod
    def add_one_month(anchor_date: date) -> date:
        month = anchor_date.month + 1
        year = anchor_date.year
        if month > 12:
            month = 1
            year += 1
        day = min(anchor_date.day, monthrange(year, month)[1])
        return anchor_date.replace(year=year, month=month, day=day)

    @classmethod
    def initialize_next_due_date(cls, reference_time: datetime) -> date:
        return cls.add_one_month(reference_time.date())

    @classmethod
    def roll_due_date_forward(cls, current_due_date: date, reference_date: date) -> date:
        next_due_date = cls.add_one_month(current_due_date)
        while next_due_date <= reference_date:
            next_due_date = cls.add_one_month(next_due_date)
        return next_due_date

    def get_overdue_days(
        self,
        subscription: MemberSubscription,
        *,
        reference_time: datetime | None = None,
    ) -> int | None:
        if subscription.next_due_date is None:
            return None
        current_date = self.get_reference_time(reference_time).date()
        overdue_days = (current_date - subscription.next_due_date).days
        if overdue_days < 0:
            return None
        return overdue_days

    def get_effective_credits(self, subscription: MemberSubscription) -> int:
        if subscription.billing_status == BillingStatus.SUSPENDED:
            return 0
        return subscription.active_credits

    def resolve_billing_status(
        self,
        subscription: MemberSubscription,
        *,
        reference_time: datetime | None = None,
    ) -> BillingStatus:
        overdue_days = self.get_overdue_days(subscription, reference_time=reference_time)
        if overdue_days is None:
            return BillingStatus.ACTIVE
        if overdue_days > 10:
            return BillingStatus.SUSPENDED
        return BillingStatus.PAYMENT_DUE

    def build_warning(
        self,
        subscription: MemberSubscription,
        *,
        reference_time: datetime | None = None,
    ) -> BillingWarningRead | None:
        overdue_days = self.get_overdue_days(subscription, reference_time=reference_time)
        if subscription.billing_status == BillingStatus.SUSPENDED:
            return BillingWarningRead(
                stage=BillingReminderStage.SUSPENDED.value,
                message="Your account has been suspended due to non-payment. Please complete payment to restore access.",
            )
        if subscription.billing_status != BillingStatus.PAYMENT_DUE or overdue_days is None:
            return None
        if overdue_days >= 9:
            return BillingWarningRead(
                stage=BillingReminderStage.DAY_9.value,
                message="Final reminder: your account will be suspended soon if payment is not received.",
            )
        if overdue_days >= 5:
            return BillingWarningRead(
                stage=BillingReminderStage.DAY_5.value,
                message="Your payment is overdue. Please complete it to avoid suspension.",
            )
        if overdue_days == 0:
            return BillingWarningRead(
                stage=BillingReminderStage.DUE_DATE.value,
                message="Your payment is due today.",
            )
        return BillingWarningRead(
            stage=BillingReminderStage.OVERDUE.value,
            message="Your payment is overdue. Please complete it to avoid suspension.",
        )

    def sync_billing_state(
        self,
        subscription: MemberSubscription,
        *,
        reference_time: datetime | None = None,
    ) -> bool:
        if subscription.status != SubscriptionStatus.ACTIVE:
            return False

        now = self.get_reference_time(reference_time)
        desired_status = self.resolve_billing_status(subscription, reference_time=now)
        changed = False

        if subscription.billing_status != desired_status:
            previous_status = subscription.billing_status
            subscription.billing_status = desired_status
            changed = True
            logger.info(
                "billing_status_changed subscription_id=%s member_id=%s previous_status=%s next_status=%s next_due_date=%s",
                subscription.id,
                subscription.member_id,
                previous_status.value,
                desired_status.value,
                subscription.next_due_date,
            )

        if desired_status == BillingStatus.SUSPENDED and subscription.suspended_at is None:
            subscription.suspended_at = now
            changed = True
        elif desired_status != BillingStatus.SUSPENDED and subscription.suspended_at is not None:
            subscription.suspended_at = None
            changed = True

        return changed

    def ensure_can_consume_credits(self, subscription: MemberSubscription) -> None:
        if subscription.billing_status == BillingStatus.SUSPENDED:
            raise BillingSuspendedError("Account access is suspended pending payment")

    async def sync_subscription_for_read(
        self,
        subscription_id: UUID,
        *,
        reference_time: datetime | None = None,
    ) -> MemberSubscription | None:
        if self.session.in_transaction():
            await self.session.rollback()

        member_id: UUID | None = None
        async with self.session.begin():
            subscription = await self.member_subscription_repository.get_by_id(subscription_id, for_update=True)
            if subscription is None:
                return None
            changed = self.sync_billing_state(subscription, reference_time=reference_time)
            if changed:
                member_id = subscription.member_id

        if member_id is not None:
            await self._invalidate_member_cache(member_id)

        return await self.member_subscription_repository.get_by_id(subscription_id)

    async def record_successful_payment(
        self,
        member_id: UUID,
        *,
        paid_at: datetime | None = None,
    ) -> MemberSubscription:
        payment_time = self.get_reference_time(paid_at)
        if self.session.in_transaction():
            await self.session.rollback()

        send_reactivated_email = False
        async with self.session.begin():
            subscription = await self.member_subscription_repository.get_active_for_member(member_id, for_update=True)
            if subscription is None:
                raise ConflictError("Member does not have an active subscription")

            previous_billing_status = subscription.billing_status
            if subscription.next_due_date is None:
                subscription.next_due_date = self.initialize_next_due_date(payment_time)
            else:
                subscription.next_due_date = self.roll_due_date_forward(
                    subscription.next_due_date,
                    payment_time.date(),
                )
            subscription.last_payment_date = payment_time
            subscription.billing_status = BillingStatus.ACTIVE
            subscription.suspended_at = None
            subscription.reminder_due_sent_at = None
            subscription.reminder_day_5_sent_at = None
            subscription.reminder_day_9_sent_at = None
            send_reactivated_email = previous_billing_status != BillingStatus.ACTIVE

            logger.info(
                "billing_payment_recorded subscription_id=%s member_id=%s previous_billing_status=%s next_due_date=%s",
                subscription.id,
                subscription.member_id,
                previous_billing_status.value,
                subscription.next_due_date,
            )

        await self._invalidate_member_cache(member_id)
        refreshed = await self.member_subscription_repository.get_active_for_member(member_id)
        assert refreshed is not None

        if send_reactivated_email:
            await self.send_payment_reactivated_email(refreshed)

        return refreshed

    async def process_daily_billing(
        self,
        *,
        reference_time: datetime | None = None,
    ) -> BillingRunSummary:
        now = self.get_reference_time(reference_time)
        summary = BillingRunSummary()
        reminder_events: list[BillingReminderEvent] = []
        changed_member_ids: set[UUID] = set()

        if self.session.in_transaction():
            await self.session.rollback()

        async with self.session.begin():
            subscriptions = await self.member_subscription_repository.list_billable_for_billing(now.date())
            summary.checked_subscriptions = len(subscriptions)

            for candidate in subscriptions:
                subscription = await self.member_subscription_repository.get_by_id(candidate.id, for_update=True)
                if subscription is None:
                    continue

                previous_status = subscription.billing_status
                changed = self.sync_billing_state(subscription, reference_time=now)
                if changed:
                    changed_member_ids.add(subscription.member_id)
                    if (
                        previous_status != BillingStatus.SUSPENDED
                        and subscription.billing_status == BillingStatus.SUSPENDED
                    ):
                        summary.suspended_accounts += 1
                        logger.info(
                            "billing_account_suspended subscription_id=%s member_id=%s suspended_at=%s",
                            subscription.id,
                            subscription.member_id,
                            subscription.suspended_at,
                        )

                reminder_stage = self._resolve_pending_reminder_stage(subscription, reference_time=now)
                if reminder_stage is None:
                    continue

                self._mark_reminder_sent(subscription, reminder_stage, now)
                changed_member_ids.add(subscription.member_id)
                reminder_events.append(self._build_reminder_event(subscription, reminder_stage))

        if changed_member_ids:
            await self._invalidate_member_cache(*changed_member_ids)

        for reminder_event in reminder_events:
            sent = await self._send_reminder_email(reminder_event)
            if sent:
                summary.reminders_sent += 1

        return summary

    def _resolve_pending_reminder_stage(
        self,
        subscription: MemberSubscription,
        *,
        reference_time: datetime,
    ) -> BillingReminderStage | None:
        if subscription.billing_status == BillingStatus.SUSPENDED:
            return None

        overdue_days = self.get_overdue_days(subscription, reference_time=reference_time)
        if overdue_days is None:
            return None
        if overdue_days >= 9:
            return BillingReminderStage.DAY_9 if subscription.reminder_day_9_sent_at is None else None
        if overdue_days >= 5:
            return BillingReminderStage.DAY_5 if subscription.reminder_day_5_sent_at is None else None
        if overdue_days == 0:
            return BillingReminderStage.DUE_DATE if subscription.reminder_due_sent_at is None else None
        return None

    @staticmethod
    def _mark_reminder_sent(
        subscription: MemberSubscription,
        stage: BillingReminderStage,
        sent_at: datetime,
    ) -> None:
        if stage == BillingReminderStage.DUE_DATE:
            subscription.reminder_due_sent_at = sent_at
            return
        if stage == BillingReminderStage.DAY_5:
            subscription.reminder_day_5_sent_at = sent_at
            return
        if stage == BillingReminderStage.DAY_9:
            subscription.reminder_day_9_sent_at = sent_at

    @staticmethod
    def _build_reminder_event(
        subscription: MemberSubscription,
        stage: BillingReminderStage,
    ) -> BillingReminderEvent:
        member = subscription.member
        if member is None:
            raise ConflictError("Billing reminder delivery requires the member relation")
        return BillingReminderEvent(
            member_id=subscription.member_id,
            member_email=member.email,
            member_name=member.full_name,
            plan_name=subscription.plan.name if subscription.plan is not None else None,
            stage=stage,
            due_date=subscription.next_due_date,
        )

    async def _send_reminder_email(self, event: BillingReminderEvent) -> bool:
        subject, text_body = self._render_billing_email(event)
        sent = await self.email_service.send_email(
            to_email=event.member_email,
            subject=subject,
            text_body=text_body,
        )
        if sent:
            logger.info(
                "billing_reminder_sent member_id=%s email=%s stage=%s due_date=%s",
                event.member_id,
                event.member_email,
                event.stage.value,
                event.due_date,
            )
        return sent

    async def send_payment_reactivated_email(self, subscription: MemberSubscription) -> bool:
        member = subscription.member
        if member is None:
            return False
        subject = "Your GymApp subscription is active again"
        text_body = (
            f"Hi {member.full_name},\n\n"
            "We received your payment and restored your access immediately.\n"
            f"Your next payment due date is {subscription.next_due_date.isoformat()}.\n\n"
            "Thank you."
        )
        sent = await self.email_service.send_email(
            to_email=member.email,
            subject=subject,
            text_body=text_body,
        )
        if sent:
            logger.info(
                "billing_payment_restored member_id=%s email=%s next_due_date=%s",
                subscription.member_id,
                member.email,
                subscription.next_due_date,
            )
        return sent

    def _render_billing_email(self, event: BillingReminderEvent) -> tuple[str, str]:
        greeting_name = event.member_name or "there"
        plan_line = f"Plan: {event.plan_name}\n" if event.plan_name else ""

        if event.stage == BillingReminderStage.DUE_DATE:
            subject = "GymApp payment due today"
            intro = "Your payment is due today."
        elif event.stage == BillingReminderStage.DAY_5:
            subject = "GymApp payment overdue"
            intro = "Your payment is overdue. Please complete it to avoid suspension."
        else:
            subject = "Final reminder before GymApp suspension"
            intro = "Final reminder: your account will be suspended soon if payment is not received."

        body = (
            f"Hi {greeting_name},\n\n"
            f"{intro}\n"
            f"Due date: {event.due_date.isoformat()}\n"
            f"{plan_line}"
            "\nPlease complete your payment to keep your access active.\n"
        )
        return subject, body

    async def _invalidate_member_cache(self, *member_ids: UUID) -> None:
        if self.cache is None or not member_ids:
            return
        await self.cache.delete(*(f"member:{member_id}" for member_id in member_ids))
