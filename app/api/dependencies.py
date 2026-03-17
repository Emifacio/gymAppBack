from collections.abc import Callable
from uuid import UUID

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import bearer_scheme, decode_access_token, extract_bearer_token
from app.domain.enums import MemberRole
from app.domain.models.member import Member
from app.infrastructure.cache.redis_client import RedisCache
from app.infrastructure.database.session import get_db_session
from app.infrastructure.integrations.strava_client import StravaClient
from app.repositories.activity_repository import ActivityRepository
from app.repositories.attendance_repository import AttendanceRepository
from app.repositories.booking_repository import BookingRepository
from app.repositories.class_repository import ClassRepository
from app.repositories.integration_repository import IntegrationRepository
from app.repositories.instructor_repository import InstructorRepository
from app.repositories.member_repository import MemberRepository
from app.repositories.member_subscription_repository import MemberSubscriptionRepository
from app.repositories.membership_plan_repository import MembershipPlanRepository
from app.repositories.plan_repository import PlanRepository
from app.repositories.waitlist_repository import WaitlistRepository
from app.services.activity_service import ActivityService
from app.services.attendance_service import AttendanceService
from app.services.auth_service import AuthService
from app.services.booking_eligibility_service import BookingEligibilityService
from app.services.booking_service import BookingService
from app.services.class_service import ClassService
from app.services.integration_service import IntegrationService
from app.services.member_service import MemberService
from app.services.plan_service import PlanService
from app.services.subscription_service import SubscriptionService


def get_cache(request: Request) -> RedisCache:
    return request.app.state.redis_cache


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_db_session),
) -> Member:
    member = await _resolve_current_user(credentials, session)
    if member is None:
        raise UnauthorizedError("Authenticated member not found or inactive")
    return member


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_db_session),
) -> Member | None:
    return await _resolve_current_user(credentials, session, required=False)


async def _resolve_current_user(
    credentials: HTTPAuthorizationCredentials | None,
    session: AsyncSession,
    *,
    required: bool = True,
) -> Member | None:
    if credentials is None:
        if required:
            raise UnauthorizedError("Missing bearer token")
        return None
    token = extract_bearer_token(credentials)
    payload = decode_access_token(token)
    subject = payload.get("sub")
    if subject is None:
        raise UnauthorizedError("Missing token subject")
    try:
        member_id = UUID(subject)
    except ValueError as exc:
        raise UnauthorizedError("Invalid token subject") from exc
    member = await MemberRepository(session).get_identity_by_id(member_id)
    if member is None or not member.is_active:
        if required:
            raise UnauthorizedError("Authenticated member not found or inactive")
        return None
    return member


def require_roles(*roles: MemberRole) -> Callable[[Member], Member]:
    async def dependency(current_user: Member = Depends(get_current_user)) -> Member:
        if current_user.role not in roles:
            raise ForbiddenError("Insufficient permissions for this action")
        return current_user

    return dependency


def enforce_member_access(current_user: Member, target_member_id: UUID) -> None:
    if current_user.role == MemberRole.ADMIN:
        return
    if current_user.id != target_member_id:
        # Instructors can VIEW member details, but others cannot.
        # However, for MUTATIONS, we need a separate check or this one must be stricter.
        # The current implementation allows INSTRUCTOR. 
        # I will leave this as is for VIEWING, and add explicit role checks in mutation routes.
        if current_user.role == MemberRole.INSTRUCTOR:
            return
        raise ForbiddenError("You can only access your own member data")


def get_auth_service(session: AsyncSession = Depends(get_db_session)) -> AuthService:
    return AuthService(session=session, member_repository=MemberRepository(session))


def get_member_service(
    session: AsyncSession = Depends(get_db_session),
    cache: RedisCache = Depends(get_cache),
) -> MemberService:
    return MemberService(
        session=session,
        member_repository=MemberRepository(session),
        instructor_repository=InstructorRepository(session),
        membership_plan_repository=MembershipPlanRepository(session),
        cache=cache,
    )


def get_class_service(
    session: AsyncSession = Depends(get_db_session),
    cache: RedisCache = Depends(get_cache),
) -> ClassService:
    return ClassService(
        session=session,
        class_repository=ClassRepository(session),
        instructor_repository=InstructorRepository(session),
        booking_repository=BookingRepository(session),
        waitlist_repository=WaitlistRepository(session),
        cache=cache,
    )


def get_booking_service(
    session: AsyncSession = Depends(get_db_session),
    cache: RedisCache = Depends(get_cache),
) -> BookingService:
    member_subscription_repository = MemberSubscriptionRepository(session)
    return BookingService(
        session=session,
        class_repository=ClassRepository(session),
        member_repository=MemberRepository(session),
        booking_repository=BookingRepository(session),
        waitlist_repository=WaitlistRepository(session),
        eligibility_service=BookingEligibilityService(
            member_repository=MemberRepository(session),
            class_repository=ClassRepository(session),
            booking_repository=BookingRepository(session),
            waitlist_repository=WaitlistRepository(session),
            member_subscription_repository=member_subscription_repository,
        ),
        subscription_service=SubscriptionService(
            session=session,
            member_repository=MemberRepository(session),
            plan_repository=PlanRepository(session),
            member_subscription_repository=member_subscription_repository,
            cache=cache,
        ),
        cache=cache,
    )


def get_plan_service(session: AsyncSession = Depends(get_db_session)) -> PlanService:
    return PlanService(session=session, plan_repository=PlanRepository(session))


def get_subscription_service(
    session: AsyncSession = Depends(get_db_session),
    cache: RedisCache = Depends(get_cache),
) -> SubscriptionService:
    return SubscriptionService(
        session=session,
        member_repository=MemberRepository(session),
        plan_repository=PlanRepository(session),
        member_subscription_repository=MemberSubscriptionRepository(session),
        cache=cache,
    )


def get_attendance_service(session: AsyncSession = Depends(get_db_session)) -> AttendanceService:
    return AttendanceService(
        session=session,
        class_repository=ClassRepository(session),
        member_repository=MemberRepository(session),
        booking_repository=BookingRepository(session),
        attendance_repository=AttendanceRepository(session),
    )


def get_integration_service(session: AsyncSession = Depends(get_db_session)) -> IntegrationService:
    return IntegrationService(
        session=session,
        member_repository=MemberRepository(session),
        integration_repository=IntegrationRepository(session),
    )


def get_activity_service(session: AsyncSession = Depends(get_db_session)) -> ActivityService:
    return ActivityService(
        session=session,
        member_repository=MemberRepository(session),
        integration_repository=IntegrationRepository(session),
        activity_repository=ActivityRepository(session),
        strava_client=StravaClient(),
    )
