from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

from app.core.exceptions import BillingSuspendedError
from app.domain.enums import BillingStatus, PlanPeriodType, SubscriptionStatus
from app.domain.models.member import Member
from app.domain.models.member_subscription import MemberSubscription
from app.domain.models.plan import Plan
from app.services.billing_service import BillingService
from app.services.subscription_service import SubscriptionService


class SessionStub:
    def __init__(self) -> None:
        self.flush = AsyncMock()
        self.rollback = AsyncMock()

    def in_transaction(self) -> bool:
        return False

    @asynccontextmanager
    async def begin(self):
        yield


class BillingServiceTests(IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.session = SessionStub()
        self.repository = Mock()
        self.cache = Mock()
        self.cache.delete = AsyncMock()
        self.email_service = Mock()
        self.email_service.send_email = AsyncMock(return_value=True)
        self.service = BillingService(
            session=self.session,
            member_subscription_repository=self.repository,
            cache=self.cache,
            email_service=self.email_service,
        )

    def _build_subscription(
        self,
        *,
        active_credits: int = 4,
        billing_status: BillingStatus = BillingStatus.ACTIVE,
        next_due_date: datetime | None = None,
    ) -> MemberSubscription:
        member_id = uuid4()
        now = datetime.now(timezone.utc)
        plan = Plan(
            id=uuid4(),
            name="Monthly Unlimited",
            credits_per_period=8,
            period_type=PlanPeriodType.MONTHLY,
            allows_free_pass=False,
            active=True,
            created_at=now,
        )
        subscription = MemberSubscription(
            id=uuid4(),
            member_id=member_id,
            plan_id=plan.id,
            active_credits=active_credits,
            period_start=now - timedelta(days=30),
            period_end=now + timedelta(days=1),
            status=SubscriptionStatus.ACTIVE,
            billing_status=billing_status,
            next_due_date=(next_due_date or now).date(),
            last_payment_date=now - timedelta(days=30),
            suspended_at=None,
            reminder_due_sent_at=None,
            reminder_day_5_sent_at=None,
            reminder_day_9_sent_at=None,
            created_at=now - timedelta(days=30),
        )
        subscription.plan = plan
        subscription.__dict__["member"] = Member(
            id=member_id,
            email="member@example.com",
            full_name="Member Example",
            password_hash="hashed-password",
            role="member",
            membership_status="active",
            is_active=True,
            profile_metadata={},
            auth_provider="local",
            created_at=now - timedelta(days=30),
            updated_at=now - timedelta(days=1),
        )
        return subscription

    async def test_due_date_transitions_to_payment_due_and_sends_first_reminder(self) -> None:
        reference_time = datetime(2026, 3, 23, 9, 0, tzinfo=timezone.utc)
        subscription = self._build_subscription(
            billing_status=BillingStatus.ACTIVE,
            next_due_date=reference_time,
        )
        self.repository.list_billable_for_billing = AsyncMock(return_value=[subscription])
        self.repository.get_by_id = AsyncMock(return_value=subscription)

        summary = await self.service.process_daily_billing(reference_time=reference_time)

        self.assertEqual(subscription.billing_status, BillingStatus.PAYMENT_DUE)
        self.assertEqual(subscription.reminder_due_sent_at, reference_time)
        self.assertEqual(summary.reminders_sent, 1)
        self.email_service.send_email.assert_awaited_once()

    async def test_day_5_reminder_is_sent_only_once(self) -> None:
        reference_time = datetime(2026, 3, 23, 9, 0, tzinfo=timezone.utc)
        subscription = self._build_subscription(
            billing_status=BillingStatus.PAYMENT_DUE,
            next_due_date=reference_time - timedelta(days=5),
        )
        self.repository.list_billable_for_billing = AsyncMock(return_value=[subscription])
        self.repository.get_by_id = AsyncMock(return_value=subscription)

        first_summary = await self.service.process_daily_billing(reference_time=reference_time)
        second_summary = await self.service.process_daily_billing(reference_time=reference_time)

        self.assertEqual(subscription.reminder_day_5_sent_at, reference_time)
        self.assertEqual(first_summary.reminders_sent, 1)
        self.assertEqual(second_summary.reminders_sent, 0)
        self.assertEqual(self.email_service.send_email.await_count, 1)

    async def test_day_9_reminder_is_sent_only_once(self) -> None:
        reference_time = datetime(2026, 3, 23, 9, 0, tzinfo=timezone.utc)
        subscription = self._build_subscription(
            billing_status=BillingStatus.PAYMENT_DUE,
            next_due_date=reference_time - timedelta(days=9),
        )
        self.repository.list_billable_for_billing = AsyncMock(return_value=[subscription])
        self.repository.get_by_id = AsyncMock(return_value=subscription)

        first_summary = await self.service.process_daily_billing(reference_time=reference_time)
        second_summary = await self.service.process_daily_billing(reference_time=reference_time)

        self.assertEqual(subscription.reminder_day_9_sent_at, reference_time)
        self.assertEqual(first_summary.reminders_sent, 1)
        self.assertEqual(second_summary.reminders_sent, 0)
        self.assertEqual(self.email_service.send_email.await_count, 1)

    async def test_day_10_plus_overdue_transitions_to_suspended(self) -> None:
        reference_time = datetime(2026, 3, 23, 9, 0, tzinfo=timezone.utc)
        subscription = self._build_subscription(
            billing_status=BillingStatus.PAYMENT_DUE,
            next_due_date=reference_time - timedelta(days=11),
        )
        self.repository.list_billable_for_billing = AsyncMock(return_value=[subscription])
        self.repository.get_by_id = AsyncMock(return_value=subscription)

        summary = await self.service.process_daily_billing(reference_time=reference_time)

        self.assertEqual(subscription.billing_status, BillingStatus.SUSPENDED)
        self.assertEqual(subscription.suspended_at, reference_time)
        self.assertEqual(summary.suspended_accounts, 1)
        self.email_service.send_email.assert_not_awaited()

    async def test_record_successful_payment_restores_active_status_and_keeps_stored_credits(self) -> None:
        payment_time = datetime(2026, 3, 23, 9, 0, tzinfo=timezone.utc)
        subscription = self._build_subscription(
            active_credits=7,
            billing_status=BillingStatus.SUSPENDED,
            next_due_date=payment_time - timedelta(days=11),
        )
        subscription.suspended_at = payment_time - timedelta(days=1)
        subscription.reminder_due_sent_at = payment_time - timedelta(days=11)
        subscription.reminder_day_5_sent_at = payment_time - timedelta(days=6)
        subscription.reminder_day_9_sent_at = payment_time - timedelta(days=2)
        self.repository.get_active_for_member = AsyncMock(return_value=subscription)

        restored = await self.service.record_successful_payment(subscription.member_id, paid_at=payment_time)

        self.assertEqual(restored.billing_status, BillingStatus.ACTIVE)
        self.assertEqual(restored.active_credits, 7)
        self.assertEqual(self.service.get_effective_credits(restored), 7)
        self.assertGreater(restored.next_due_date, payment_time.date())
        self.assertEqual(restored.last_payment_date, payment_time)
        self.assertIsNone(restored.suspended_at)
        self.assertIsNone(restored.reminder_due_sent_at)
        self.assertIsNone(restored.reminder_day_5_sent_at)
        self.assertIsNone(restored.reminder_day_9_sent_at)
        self.email_service.send_email.assert_awaited_once()

    async def test_scheduler_is_idempotent_when_run_multiple_times_same_day(self) -> None:
        reference_time = datetime(2026, 3, 23, 9, 0, tzinfo=timezone.utc)
        subscription = self._build_subscription(
            billing_status=BillingStatus.ACTIVE,
            next_due_date=reference_time,
        )
        self.repository.list_billable_for_billing = AsyncMock(return_value=[subscription])
        self.repository.get_by_id = AsyncMock(return_value=subscription)

        await self.service.process_daily_billing(reference_time=reference_time)
        reminder_sent_at = subscription.reminder_due_sent_at
        await self.service.process_daily_billing(reference_time=reference_time)

        self.assertEqual(subscription.reminder_due_sent_at, reminder_sent_at)
        self.assertEqual(self.email_service.send_email.await_count, 1)

    def test_suspended_subscription_reports_zero_effective_credits(self) -> None:
        subscription = self._build_subscription(billing_status=BillingStatus.SUSPENDED)

        self.assertEqual(self.service.get_effective_credits(subscription), 0)
        self.assertEqual(subscription.effective_credits, 0)


class SubscriptionServiceBillingEnforcementTests(IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.session = SessionStub()
        self.member_repository = Mock()
        self.plan_repository = Mock()
        self.subscription_repository = Mock()
        self.billing_service = BillingService(
            session=self.session,
            member_subscription_repository=self.subscription_repository,
            cache=None,
            email_service=Mock(send_email=AsyncMock(return_value=True)),
        )
        self.service = SubscriptionService(
            session=self.session,
            member_repository=self.member_repository,
            plan_repository=self.plan_repository,
            member_subscription_repository=self.subscription_repository,
            cache=None,
            billing_service=self.billing_service,
        )

    def test_suspended_accounts_cannot_consume_credits(self) -> None:
        plan = Plan(
            id=uuid4(),
            name="Credits",
            credits_per_period=4,
            period_type=PlanPeriodType.MONTHLY,
            allows_free_pass=False,
            active=True,
            created_at=datetime.now(timezone.utc),
        )
        subscription = MemberSubscription(
            id=uuid4(),
            member_id=uuid4(),
            plan_id=plan.id,
            active_credits=3,
            period_start=datetime.now(timezone.utc) - timedelta(days=10),
            period_end=datetime.now(timezone.utc) + timedelta(days=20),
            status=SubscriptionStatus.ACTIVE,
            billing_status=BillingStatus.SUSPENDED,
            next_due_date=datetime.now(timezone.utc).date() - timedelta(days=11),
            last_payment_date=datetime.now(timezone.utc) - timedelta(days=40),
            suspended_at=datetime.now(timezone.utc),
            reminder_due_sent_at=None,
            reminder_day_5_sent_at=None,
            reminder_day_9_sent_at=None,
            created_at=datetime.now(timezone.utc) - timedelta(days=40),
        )
        subscription.plan = plan

        with self.assertRaises(BillingSuspendedError):
            self.service.consume_credit_for_booking(subscription)
