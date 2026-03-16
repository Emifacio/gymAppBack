from datetime import datetime
from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.orm import selectinload

from app.domain.enums import SubscriptionStatus
from app.domain.models.member_subscription import MemberSubscription
from app.domain.models.plan import Plan
from app.repositories.base_repository import BaseRepository


class MemberSubscriptionRepository(BaseRepository[MemberSubscription]):
    def _detail_query(self) -> Select[tuple[MemberSubscription]]:
        return select(MemberSubscription).options(
            selectinload(MemberSubscription.plan),
        )

    async def get_by_id(self, subscription_id: UUID, *, for_update: bool = False) -> MemberSubscription | None:
        stmt = self._detail_query().where(MemberSubscription.id == subscription_id)
        if for_update:
            stmt = stmt.with_for_update()
        return await self.session.scalar(stmt)

    async def get_active_for_member(
        self,
        member_id: UUID,
        *,
        for_update: bool = False,
    ) -> MemberSubscription | None:
        stmt = (
            self._detail_query()
            .where(
                MemberSubscription.member_id == member_id,
                MemberSubscription.status == SubscriptionStatus.ACTIVE,
            )
            .order_by(MemberSubscription.created_at.desc())
            .limit(1)
        )
        if for_update:
            stmt = stmt.with_for_update()
        return await self.session.scalar(stmt)

    async def get_latest_for_member(self, member_id: UUID) -> MemberSubscription | None:
        stmt = (
            self._detail_query()
            .where(MemberSubscription.member_id == member_id)
            .order_by(MemberSubscription.created_at.desc())
            .limit(1)
        )
        return await self.session.scalar(stmt)

    async def list_for_member(self, member_id: UUID) -> list[MemberSubscription]:
        stmt = (
            self._detail_query()
            .where(MemberSubscription.member_id == member_id)
            .order_by(MemberSubscription.created_at.desc())
        )
        result = await self.session.scalars(stmt)
        return list(result.unique().all())

    async def list_due_for_reset(self, now: datetime) -> list[MemberSubscription]:
        stmt = (
            self._detail_query()
            .where(
                MemberSubscription.status == SubscriptionStatus.ACTIVE,
                MemberSubscription.period_end <= now,
            )
            .order_by(MemberSubscription.period_end.asc(), MemberSubscription.created_at.asc())
        )
        result = await self.session.scalars(stmt)
        return list(result.unique().all())
