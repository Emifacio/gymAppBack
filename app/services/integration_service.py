from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import ForbiddenError, NotFoundError, ServiceUnavailableError
from app.domain.enums import IntegrationProvider, IntegrationStatus, MemberRole
from app.domain.models.integration_account import IntegrationAccount
from app.domain.models.member import Member
from app.repositories.integration_repository import IntegrationRepository
from app.repositories.member_repository import MemberRepository
from app.schemas.integration_schema import (
    IntegrationAccountRead,
    StravaConnectRequest,
    TaskEnqueueResponse,
)
from app.workers.tasks.activity_sync import sync_member_activities_task


class IntegrationService:
    def __init__(
        self,
        session: AsyncSession,
        member_repository: MemberRepository,
        integration_repository: IntegrationRepository,
    ) -> None:
        self.session = session
        self.member_repository = member_repository
        self.integration_repository = integration_repository

    async def connect_strava(
        self,
        member_id: UUID,
        payload: StravaConnectRequest,
        actor: Member,
    ) -> IntegrationAccountRead:
        if actor.role != MemberRole.ADMIN and actor.id != member_id:
            raise ForbiddenError("You can only connect integrations for your own account")
        if self.session.in_transaction():
            await self.session.rollback()

        async with self.session.begin():
            member = await self.member_repository.get_by_id(member_id, for_update=True)
            if member is None:
                raise NotFoundError("Member not found")

            account = await self.integration_repository.get_by_member_provider(member_id, IntegrationProvider.STRAVA)
            if account is None:
                account = IntegrationAccount(
                    member_id=member_id,
                    provider=IntegrationProvider.STRAVA,
                    external_account_id=payload.external_account_id,
                    access_token=payload.access_token,
                    refresh_token=payload.refresh_token,
                    token_expires_at=payload.token_expires_at,
                    status=IntegrationStatus.CONNECTED,
                    provider_metadata={},
                )
                await self.integration_repository.add(account)
            else:
                account.external_account_id = payload.external_account_id
                account.access_token = payload.access_token
                account.refresh_token = payload.refresh_token
                account.token_expires_at = payload.token_expires_at
                account.status = IntegrationStatus.CONNECTED

        refreshed = await self.integration_repository.get_by_member_provider(member_id, IntegrationProvider.STRAVA)
        assert refreshed is not None
        return IntegrationAccountRead.model_validate(refreshed)

    async def enqueue_activity_sync(self, member_id: UUID, actor: Member) -> TaskEnqueueResponse:
        settings = get_settings()
        if not settings.redis_configured:
            raise ServiceUnavailableError(
                "Background jobs require Redis configuration. Set REDIS_URL on the web service first."
            )
        if actor.role != MemberRole.ADMIN and actor.id != member_id:
            raise ForbiddenError("You can only sync activities for your own account")
        if await self.member_repository.get_by_id(member_id) is None:
            raise NotFoundError("Member not found")
        account = await self.integration_repository.get_by_member_provider(member_id, IntegrationProvider.STRAVA)
        if account is None or account.status != IntegrationStatus.CONNECTED:
            raise NotFoundError("Connected Strava account not found")
        task = sync_member_activities_task.delay(str(member_id))
        return TaskEnqueueResponse(task_id=task.id, status="queued")
