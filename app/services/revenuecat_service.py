import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID
from urllib.parse import quote

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.exceptions import ServiceUnavailableError
from app.domain.models.member import Member
from app.infrastructure.cache.redis_client import RedisCache
from app.repositories.member_repository import MemberRepository

logger = logging.getLogger(__name__)


@dataclass
class RevenueCatPremiumState:
    entitlement_id: str
    is_premium: bool
    product_id: str | None = None
    expires_at: datetime | None = None
    last_synced_at: datetime | None = None
    store: str | None = None


@dataclass
class RevenueCatMemberSyncResult:
    result: str
    app_user_id: str
    member_id: UUID | None = None
    state: RevenueCatPremiumState | None = None


def _parse_revenuecat_datetime(value: str | None) -> datetime | None:
    if not value:
        return None

    normalized = value.strip()
    if not normalized:
        return None

    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"

    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


class RevenueCatService:
    def __init__(
        self,
        *,
        session: AsyncSession,
        member_repository: MemberRepository,
        cache: RedisCache,
        settings: Settings,
    ) -> None:
        self.session = session
        self.member_repository = member_repository
        self.cache = cache
        self.settings = settings

    async def sync_member(self, member: Member) -> RevenueCatPremiumState:
        previous_is_premium = member.is_premium
        state = await self.get_premium_state(str(member.id))

        if previous_is_premium != state.is_premium:
            member.is_premium = state.is_premium
            await self.session.commit()
            await self.cache.delete(f"member:{member.id}")

        logger.info(
            "revenuecat_sync member_id=%s previous_is_premium=%s new_is_premium=%s expires_at=%s",
            member.id,
            previous_is_premium,
            state.is_premium,
            state.expires_at.isoformat() if state.expires_at else None,
        )
        return state

    async def sync_member_by_app_user_id(self, app_user_id: str) -> RevenueCatMemberSyncResult:
        try:
            member_id = UUID(app_user_id)
        except ValueError:
            return RevenueCatMemberSyncResult(result="invalid_user", app_user_id=app_user_id)

        member = await self.member_repository.get_identity_by_id(member_id)
        if member is None:
            return RevenueCatMemberSyncResult(
                result="member_not_found",
                app_user_id=app_user_id,
                member_id=member_id,
            )

        state = await self.sync_member(member)
        return RevenueCatMemberSyncResult(
            result="processed",
            app_user_id=app_user_id,
            member_id=member.id,
            state=state,
        )

    async def get_premium_state(self, app_user_id: str) -> RevenueCatPremiumState:
        if not self.settings.revenuecat_secret_api_key:
            raise ServiceUnavailableError("RevenueCat server billing is not configured")

        url = (
            f"{self.settings.revenuecat_api_base_url.rstrip('/')}/v1/subscribers/"
            f"{quote(app_user_id, safe='')}"
        )
        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {self.settings.revenuecat_secret_api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=self.settings.revenuecat_timeout_seconds) as client:
                response = await client.get(url, headers=headers)
        except httpx.HTTPError as exc:
            logger.exception("revenuecat_request_failed app_user_id=%s", app_user_id)
            raise ServiceUnavailableError("RevenueCat is temporarily unavailable") from exc

        now = datetime.now(timezone.utc)

        if response.status_code == 404:
            return RevenueCatPremiumState(
                entitlement_id=self.settings.revenuecat_premium_entitlement_id,
                is_premium=False,
                last_synced_at=now,
            )

        if response.is_error:
            logger.error(
                "revenuecat_request_unexpected_status app_user_id=%s status_code=%s",
                app_user_id,
                response.status_code,
            )
            raise ServiceUnavailableError("RevenueCat sync failed")

        payload = response.json()
        subscriber = payload.get("subscriber") if isinstance(payload, dict) else None
        entitlements = subscriber.get("entitlements") if isinstance(subscriber, dict) else None
        entitlement = (
            entitlements.get(self.settings.revenuecat_premium_entitlement_id)
            if isinstance(entitlements, dict)
            else None
        )

        if not isinstance(entitlement, dict):
            return RevenueCatPremiumState(
                entitlement_id=self.settings.revenuecat_premium_entitlement_id,
                is_premium=False,
                last_synced_at=now,
            )

        expires_at = _parse_revenuecat_datetime(entitlement.get("expires_date"))
        is_premium = expires_at is not None and expires_at > now

        return RevenueCatPremiumState(
            entitlement_id=self.settings.revenuecat_premium_entitlement_id,
            is_premium=is_premium,
            product_id=entitlement.get("product_identifier"),
            expires_at=expires_at,
            last_synced_at=now,
            store=entitlement.get("store"),
        )
