from datetime import timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import create_access_token, hash_password, verify_password
from app.domain.enums import MemberRole, MembershipStatus
from app.domain.models.member import Member
from app.repositories.member_repository import MemberRepository
from app.schemas.auth_schema import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.member_schema import MemberRead


class AuthService:
    def __init__(self, session: AsyncSession, member_repository: MemberRepository) -> None:
        self.session = session
        self.member_repository = member_repository

    async def register(self, payload: RegisterRequest) -> TokenResponse:
        if self.session.in_transaction():
            await self.session.rollback()
        async with self.session.begin():
            if await self.member_repository.get_by_email(payload.email):
                raise ConflictError("A member with that email already exists")

            role = MemberRole.ADMIN if await self.member_repository.count() == 0 else MemberRole.MEMBER
            member = Member(
                email=payload.email,
                full_name=payload.full_name,
                password_hash=hash_password(payload.password),
                phone=payload.phone,
                role=role,
                membership_status=MembershipStatus.ACTIVE,
                is_active=True,
            )
            await self.member_repository.add(member)

        created_member = await self.member_repository.get_by_id(member.id)
        assert created_member is not None

        settings = get_settings()
        access_token = create_access_token(
            str(created_member.id),
            expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
        )
        return TokenResponse(access_token=access_token, member=MemberRead.model_validate(created_member))

    async def login(self, payload: LoginRequest) -> TokenResponse:
        member = await self.member_repository.get_by_email(payload.email)
        if member is None or not verify_password(payload.password, member.password_hash):
            raise UnauthorizedError("Invalid email or password")
        if not member.is_active:
            raise UnauthorizedError("Member account is inactive")

        settings = get_settings()
        access_token = create_access_token(
            str(member.id),
            expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
        )
        return TokenResponse(access_token=access_token, member=MemberRead.model_validate(member))
