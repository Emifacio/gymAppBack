from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import selectinload

from app.domain.enums import MemberRole, MembershipStatus
from app.domain.models.member import Member
from app.domain.models.member_subscription import MemberSubscription
from app.domain.models.plan import Plan
from app.repositories.base_repository import BaseRepository


class MemberRepository(BaseRepository[Member]):
    def _detail_query(self) -> Select[tuple[Member]]:
        return select(Member).options(
            selectinload(Member.membership_plan),
            selectinload(Member.instructor_profile),
            selectinload(Member.subscriptions).selectinload(MemberSubscription.plan),
        )

    async def count(self) -> int:
        return await self.session.scalar(select(func.count()).select_from(Member)) or 0

    async def get_by_id(self, member_id: UUID, *, for_update: bool = False) -> Member | None:
        stmt = self._detail_query().where(Member.id == member_id)
        if for_update:
            stmt = stmt.with_for_update()
        return await self.session.scalar(stmt)

    async def get_by_email(self, email: str) -> Member | None:
        stmt = self._detail_query().where(func.lower(Member.email) == email.lower())
        return await self.session.scalar(stmt)

    async def list(
        self,
        *,
        role: MemberRole | None = None,
        membership_status: MembershipStatus | None = None,
        offset: int = 0,
        limit: int = 100,
    ) -> list[Member]:
        stmt = self._detail_query().order_by(Member.created_at.desc()).offset(offset).limit(limit)
        if role is not None:
            stmt = stmt.where(Member.role == role)
        if membership_status is not None:
            stmt = stmt.where(Member.membership_status == membership_status)
        result = await self.session.scalars(stmt)
        return list(result.unique().all())
