from uuid import UUID

from sqlalchemy import select

from app.domain.enums import IntegrationProvider
from app.domain.models.integration_account import IntegrationAccount
from app.repositories.base_repository import BaseRepository


class IntegrationRepository(BaseRepository[IntegrationAccount]):
    async def get_by_member_provider(
        self,
        member_id: UUID,
        provider: IntegrationProvider,
    ) -> IntegrationAccount | None:
        stmt = select(IntegrationAccount).where(
            IntegrationAccount.member_id == member_id,
            IntegrationAccount.provider == provider,
        )
        return await self.session.scalar(stmt)

