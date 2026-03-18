from __future__ import annotations

from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, Mock, patch

from app.core.exceptions import ConflictError, UnauthorizedError


class AuthServiceGoogleLoginLinkingTests(IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        from contextlib import asynccontextmanager

        class SessionStub:
            def __init__(self) -> None:
                self.flush = AsyncMock()
                self.rollback = AsyncMock()

            def in_transaction(self) -> bool:
                return False

            @asynccontextmanager
            async def begin(self):
                yield

        self.session = SessionStub()
        self.member_repository = Mock()

    async def test_google_login_requires_verified_email(self) -> None:
        from app.services.auth_service import AuthService

        service = AuthService(session=self.session, member_repository=self.member_repository)

        with patch("app.services.auth_service.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = {
                "sub": "12345",
                "email": "unverified@example.com",
                "name": "Test",
                "email_verified": False,
            }

            with self.assertRaises(UnauthorizedError) as context:
                await service.google_login("fake_token", ["client_id"])

            self.assertIn("not verified", str(context.exception.detail))

    async def test_google_login_requires_sub(self) -> None:
        from app.services.auth_service import AuthService

        service = AuthService(session=self.session, member_repository=self.member_repository)

        with patch("app.services.auth_service.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = {
                "sub": None,
                "email": "test@example.com",
                "name": "Test",
                "email_verified": True,
            }

            with self.assertRaises(UnauthorizedError) as context:
                await service.google_login("fake_token", ["client_id"])

            self.assertIn("missing subject", str(context.exception.detail))

    async def test_google_login_fails_for_invalid_token(self) -> None:
        from app.services.auth_service import AuthService

        service = AuthService(session=self.session, member_repository=self.member_repository)

        with patch("app.services.auth_service.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.side_effect = ValueError("Invalid token")

            with self.assertRaises(UnauthorizedError) as context:
                await service.google_login("fake_token", ["client_id"])

            self.assertIn("Invalid Google ID token", str(context.exception.detail))

    async def test_google_login_rejects_local_account_with_different_google_sub(self) -> None:
        from app.domain.enums import AuthProvider
        from app.domain.models.member import Member
        from app.services.auth_service import AuthService
        from datetime import datetime, timezone
        from uuid import uuid4

        local_member = Member(
            id=uuid4(),
            email="google@example.com",
            full_name="Local User",
            password_hash="hashed_password",
            role="member",
            membership_status="active",
            is_active=True,
            profile_metadata={},
            auth_provider=AuthProvider.LOCAL,
            google_sub="different_sub",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        self.member_repository.get_by_google_sub = AsyncMock(return_value=None)
        self.member_repository.get_by_email = AsyncMock(return_value=local_member)

        from app.services.auth_service import AuthService

        service = AuthService(session=self.session, member_repository=self.member_repository)

        with patch("app.services.auth_service.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = {
                "sub": "12345",
                "email": "google@example.com",
                "name": "Google User",
                "email_verified": True,
            }

            with self.assertRaises(ConflictError) as context:
                await service.google_login("fake_token", ["client_id"])

            self.assertIn("different Google account", str(context.exception.detail))


class AuthServiceLocalLoginTests(IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        from contextlib import asynccontextmanager
        from app.core.security import hash_password
        from app.domain.enums import AuthProvider
        from app.domain.models.member import Member
        from uuid import uuid4

        class SessionStub:
            def __init__(self) -> None:
                self.flush = AsyncMock()
                self.rollback = AsyncMock()

            def in_transaction(self) -> bool:
                return False

            @asynccontextmanager
            async def begin(self):
                yield

        self.session = SessionStub()
        self.member_repository = Mock()
        self.hash_password = hash_password

    async def test_login_fails_for_google_only_account(self) -> None:
        from app.domain.models.member import Member
        from app.services.auth_service import AuthService
        from uuid import uuid4
        from datetime import datetime, timezone

        member = Member(
            id=uuid4(),
            email="test@example.com",
            full_name="Test User",
            password_hash="",
            role="member",
            membership_status="active",
            is_active=True,
            profile_metadata={},
            auth_provider="google",
            google_sub="12345",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        self.member_repository.get_by_email = AsyncMock(return_value=member)

        from app.schemas.auth_schema import LoginRequest
        from app.services.auth_service import AuthService

        service = AuthService(session=self.session, member_repository=self.member_repository)
        payload = LoginRequest(email="test@example.com", password="password123")

        with self.assertRaises(UnauthorizedError) as context:
            await service.login(payload)

        self.assertIn("Google Sign-In", str(context.exception.detail))

    async def test_login_fails_for_nonexistent_email(self) -> None:
        from app.services.auth_service import AuthService

        self.member_repository.get_by_email = AsyncMock(return_value=None)

        from app.schemas.auth_schema import LoginRequest

        service = AuthService(session=self.session, member_repository=self.member_repository)
        payload = LoginRequest(email="nonexistent@example.com", password="password123")

        with self.assertRaises(UnauthorizedError):
            await service.login(payload)

    async def test_login_fails_for_wrong_password(self) -> None:
        from app.domain.models.member import Member
        from app.services.auth_service import AuthService
        from uuid import uuid4
        from datetime import datetime, timezone

        member = Member(
            id=uuid4(),
            email="test@example.com",
            full_name="Test User",
            password_hash=self.hash_password("password123"),
            role="member",
            membership_status="active",
            is_active=True,
            profile_metadata={},
            auth_provider="local",
            google_sub=None,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        self.member_repository.get_by_email = AsyncMock(return_value=member)

        from app.schemas.auth_schema import LoginRequest

        service = AuthService(session=self.session, member_repository=self.member_repository)
        payload = LoginRequest(email="test@example.com", password="wrongpassword")

        with self.assertRaises(UnauthorizedError):
            await service.login(payload)
