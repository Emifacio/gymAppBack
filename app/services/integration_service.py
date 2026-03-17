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
        if not await self.member_repository.exists_by_id(member_id):
            raise NotFoundError("Member not found")
        account = await self.integration_repository.get_by_member_provider(member_id, IntegrationProvider.STRAVA)
        if account is None or account.status != IntegrationStatus.CONNECTED:
            raise NotFoundError("Connected Strava account not found")
    async def complete_strava_auth(self, member_id: UUID, code: str) -> IntegrationAccountRead:
        from app.infrastructure.integrations.strava_client import StravaClient
        client = StravaClient()
        token_data = await client.exchange_token(code)
        
        async with self.session.begin():
            account = await self.integration_repository.get_by_member_provider(member_id, IntegrationProvider.STRAVA)
            
            # Strava returns athlete ID in the token exchange usually, 
            # but let's just use what's returned in token_data
            external_id = str(token_data.get("athlete", {}).get("id", ""))
            
            if account is None:
                account = IntegrationAccount(
                    member_id=member_id,
                    provider=IntegrationProvider.STRAVA,
                    external_account_id=external_id,
                    access_token=token_data["access_token"],
                    refresh_token=token_data["refresh_token"],
                    token_expires_at=datetime.fromtimestamp(token_data["expires_at"]),
                    status=IntegrationStatus.CONNECTED,
                    provider_metadata=token_data.get("athlete", {}),
                )
                await self.integration_repository.add(account)
            else:
                account.external_account_id = external_id
                account.access_token = token_data["access_token"]
                account.refresh_token = token_data["refresh_token"]
                account.token_expires_at = datetime.fromtimestamp(token_data["expires_at"])
                account.status = IntegrationStatus.CONNECTED
                account.provider_metadata = token_data.get("athlete", {})
                
        return IntegrationAccountRead.model_validate(account)

    async def share_workout_to_strava(self, member_id: UUID, booking_id: UUID) -> dict:
        from app.infrastructure.integrations.strava_client import StravaClient
        from app.repositories.booking_repository import BookingRepository
        
        account = await self.integration_repository.get_by_member_provider(member_id, IntegrationProvider.STRAVA)
        if not account or account.status != IntegrationStatus.CONNECTED:
            raise NotFoundError("Strava account not connected")
            
        # Refresh token if expired
        if account.token_expires_at and account.token_expires_at <= datetime.now(account.token_expires_at.tzinfo):
            client = StravaClient()
            new_tokens = await client.refresh_token(account.refresh_token)
            account.access_token = new_tokens["access_token"]
            account.refresh_token = new_tokens["refresh_token"]
            account.token_expires_at = datetime.fromtimestamp(new_tokens["expires_at"])
            await self.session.commit()
            
        booking = await BookingRepository(self.session).get_by_id(booking_id)
        if not booking:
            raise NotFoundError("Booking not found")
            
        gym_class = booking.gym_class
        client = StravaClient()
        result = await client.create_activity(
            access_token=account.access_token,
            name=f"Clase de {gym_class.title} en GymApp",
            type="Workout",
            start_date_local=gym_class.start_time,
            elapsed_time=int((gym_class.end_time - gym_class.start_time).total_seconds()),
            description=f"Entrenamiento completado. {gym_class.description or ''}"
        )
        return result
