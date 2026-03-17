from uuid import UUID
import asyncio
from google.oauth2 import id_token
from google.auth.transport import requests

from sqlalchemy import func, inspect as sa_inspect, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError, UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)
from app.domain.enums import MemberRole, MembershipStatus
from app.domain.models.member import Member
from app.repositories.member_repository import MemberRepository
from app.schemas.auth_schema import LoginRequest, RefreshTokenRequest, RegisterRequest, TokenResponse
from app.schemas.member_schema import InstructorProfileRead, MemberRead, MembershipPlanRead


class AuthService:
    def __init__(self, session: AsyncSession, member_repository: MemberRepository) -> None:
        self.session = session
        self.member_repository = member_repository

    async def register(self, payload: RegisterRequest) -> TokenResponse:
        # Email is normalized in _get_member_by_email
        existing_member = await self._get_member_by_email(payload.email)
        if existing_member is not None:
            raise ConflictError("A member with this email already exists")

        role = await self._resolve_registration_role()
        member = Member(
            email=payload.email,
            full_name=payload.full_name,
            password_hash=hash_password(payload.password),
            phone=payload.phone,
            role=role,
            membership_status=MembershipStatus.ACTIVE,
            is_active=True,
            profile_metadata={},
        )

        if self.session.in_transaction():
            await self.session.rollback()

        async with self.session.begin():
            self.session.add(member)

        await self.session.refresh(member)
        created_member = await self.member_repository.get_by_id(member.id)
        if created_member is None:
            raise NotFoundError("Registered member could not be reloaded")
        return self._build_token_response(created_member)

    async def login(self, payload: LoginRequest) -> TokenResponse:
        member = await self._get_member_by_email(payload.email)
        if member is None or not verify_password(payload.password, member.password_hash):
            raise UnauthorizedError("Invalid email or password")
        if not member.is_active:
            raise UnauthorizedError("Authenticated member not found or inactive")
        return self._build_token_response(member)

    async def refresh_token(self, payload: RefreshTokenRequest) -> TokenResponse:
        token_payload = decode_refresh_token(payload.refresh_token)
        subject = token_payload.get("sub")
        if subject is None:
            raise UnauthorizedError("Missing token subject")
        try:
            member_id = UUID(subject)
        except ValueError as exc:
            raise UnauthorizedError("Invalid token subject") from exc

        member = await self.member_repository.get_by_id(member_id)
        if member is None or not member.is_active:
            raise UnauthorizedError("Authenticated member not found or inactive")
        return self._build_token_response(member)

    async def _get_member_by_email(self, email: str) -> Member | None:
        normalized_email = email.lower().strip()
        return await self.member_repository.get_by_email(normalized_email)

    async def _resolve_registration_role(self) -> MemberRole:
        statement = select(func.count()).select_from(Member)
        result = await self.session.execute(statement)
        member_count = result.scalar_one()
        return MemberRole.ADMIN if member_count == 0 else MemberRole.MEMBER

    def _build_token_response(self, member: Member) -> TokenResponse:
        member_id = str(member.id)
        state = sa_inspect(member)

        membership_plan = None
        if "membership_plan" not in state.unloaded and member.membership_plan is not None:
            membership_plan = MembershipPlanRead.model_validate(member.membership_plan)

        instructor_profile = None
        if "instructor_profile" not in state.unloaded and member.instructor_profile is not None:
            instructor_profile = InstructorProfileRead.model_validate(member.instructor_profile)

        return TokenResponse(
            access_token=create_access_token(member_id),
            refresh_token=create_refresh_token(member_id),
            member=MemberRead(
                id=member.id,
                email=member.email,
                full_name=member.full_name,
                phone=member.phone,
                birth_date=member.birth_date,
                emergency_contact=member.emergency_contact,
                notes=member.notes,
                role=member.role,
                membership_status=member.membership_status,
                is_active=member.is_active,
                membership_plan=membership_plan,
                instructor_profile=instructor_profile,
                created_at=member.created_at,
                updated_at=member.updated_at,
            ),
        )

    async def google_login(self, id_token_str: str, client_id: str) -> TokenResponse:
        try:
            # Specify the CLIENT_ID of the app that accesses the backend:
            idinfo = id_token.verify_oauth2_token(id_token_str, requests.Request(), client_id)

            # ID token is valid. Get the user's Google Account ID from the decoded token.
            email = idinfo['email']
            full_name = idinfo.get('name', email.split('@')[0])
            
            member = await self._get_member_by_email(email)
            if member is None:
                # Provision new user
                role = await self._resolve_registration_role()
                member = Member(
                    email=email.lower().strip(),
                    full_name=full_name,
                    password_hash="", # No password for OAuth users
                    role=role,
                    membership_status=MembershipStatus.ACTIVE,
                    is_active=True,
                    profile_metadata={},
                )
                if self.session.in_transaction():
                    await self.session.rollback()

                async with self.session.begin():
                    self.session.add(member)
                await self.session.refresh(member)
                
            return self._build_token_response(member)
        except ValueError:
            # Invalid token
            raise UnauthorizedError("Invalid Google ID token")
