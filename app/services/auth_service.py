from uuid import UUID

from google.auth.transport import requests
from google.oauth2 import id_token
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
from app.domain.enums import AuthProvider, MemberRole, MembershipStatus
from app.domain.models.member import Member
from app.repositories.member_repository import MemberRepository
from app.schemas.auth_schema import LoginRequest, RefreshTokenRequest, RegisterRequest, TokenResponse
from app.schemas.member_schema import InstructorProfileRead, MemberRead, MembershipPlanRead


class AuthService:
    def __init__(self, session: AsyncSession, member_repository: MemberRepository) -> None:
        self.session = session
        self.member_repository = member_repository

    async def register(self, payload: RegisterRequest) -> TokenResponse:
        existing_member = await self._get_member_by_email(payload.email)
        if existing_member is not None:
            raise ConflictError("A member with this email already exists")

        role = await self._resolve_registration_role()
        member = Member(
            email=payload.email.lower().strip(),
            full_name=payload.full_name,
            password_hash=hash_password(payload.password),
            phone=payload.phone,
            role=role,
            membership_status=MembershipStatus.ACTIVE,
            is_active=True,
            profile_metadata={},
            auth_provider=AuthProvider.LOCAL,
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
        if member is None:
            raise UnauthorizedError("Invalid email or password")

        if member.auth_provider == AuthProvider.GOOGLE and not member.password_hash:
            raise UnauthorizedError("This account uses Google Sign-In. Please use the Google button to log in.")

        if not verify_password(payload.password, member.password_hash):
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

    async def google_login(self, id_token_str: str, client_ids: list[str]) -> TokenResponse:
        idinfo = None
        last_error: Exception | None = None

        for client_id in client_ids:
            try:
                idinfo = id_token.verify_oauth2_token(id_token_str, requests.Request(), client_id)
                break
            except ValueError as exc:
                last_error = exc

        if idinfo is None:
            raise UnauthorizedError("Invalid Google ID token") from last_error

        google_sub = idinfo.get("sub")
        if not google_sub:
            raise UnauthorizedError("Google ID token missing subject")

        email = idinfo.get("email")
        if not email:
            raise UnauthorizedError("Google ID token missing email")

        if idinfo.get("email_verified") is False:
            raise UnauthorizedError("Google account email is not verified")

        normalized_email = email.lower().strip()
        full_name = idinfo.get("name", email.split("@")[0])
        google_picture_url = idinfo.get("picture")

        existing_by_sub = await self.member_repository.get_by_google_sub(google_sub)
        if existing_by_sub is not None:
            if not existing_by_sub.is_active:
                raise UnauthorizedError("Authenticated member not found or inactive")
            if google_picture_url and existing_by_sub.google_picture_url != google_picture_url:
                existing_by_sub.google_picture_url = google_picture_url
            return self._build_token_response(existing_by_sub)

        existing_by_email = await self._get_member_by_email(email)
        if existing_by_email is not None:
            if existing_by_email.auth_provider == AuthProvider.GOOGLE:
                if existing_by_email.google_sub is None:
                    existing_by_email.google_sub = google_sub
                    if google_picture_url:
                        existing_by_email.google_picture_url = google_picture_url
                    if not existing_by_email.is_active:
                        raise UnauthorizedError("Authenticated member not found or inactive")
                    return self._build_token_response(existing_by_email)
                else:
                    raise ConflictError(
                        "This Google account is already linked to another member. "
                        "If you own this Google account, please contact support."
                    )

            if existing_by_email.auth_provider == AuthProvider.LOCAL:
                if existing_by_email.google_sub is not None:
                    raise ConflictError(
                        "A different Google account is already linked to this email. "
                        "Please use a different Google account or log in with your password."
                    )

                existing_by_email.google_sub = google_sub
                if google_picture_url:
                    existing_by_email.google_picture_url = google_picture_url
                if not existing_by_email.is_active:
                    raise UnauthorizedError("Authenticated member not found or inactive")
                return self._build_token_response(existing_by_email)

        role = await self._resolve_registration_role()
        member = Member(
            email=normalized_email,
            full_name=full_name,
            password_hash="",
            role=role,
            membership_status=MembershipStatus.ACTIVE,
            is_active=True,
            profile_metadata={},
            auth_provider=AuthProvider.GOOGLE,
            google_sub=google_sub,
            google_picture_url=google_picture_url,
        )
        if self.session.in_transaction():
            await self.session.rollback()

        async with self.session.begin():
            self.session.add(member)
        await self.session.refresh(member)

        created_member = await self.member_repository.get_by_id(member.id)
        if created_member is None:
            raise NotFoundError("Google member could not be reloaded")
        return self._build_token_response(created_member)

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
                is_premium=member.is_premium,
                google_picture_url=member.google_picture_url,
                profile_image_url=member.profile_image_url,
                membership_plan=membership_plan,
                instructor_profile=instructor_profile,
                created_at=member.created_at,
                updated_at=member.updated_at,
            ),
        )
