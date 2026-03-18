from fastapi import APIRouter, Depends, status

from app.api.dependencies import get_auth_service
from app.core.config import get_settings
from app.schemas.auth_schema import GoogleLoginRequest, LoginRequest, RefreshTokenRequest, RegisterRequest, TokenResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, service: AuthService = Depends(get_auth_service)) -> TokenResponse:
    return await service.register(payload)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, service: AuthService = Depends(get_auth_service)) -> TokenResponse:
    return await service.login(payload)


@router.post("/google-login", response_model=TokenResponse)
async def google_login(payload: GoogleLoginRequest, service: AuthService = Depends(get_auth_service)) -> TokenResponse:
    allowed_client_ids = settings.google_client_ids or []
    if not allowed_client_ids:
        from app.core.exceptions import ForbiddenError

        raise ForbiddenError("Google OAuth is not configured")

    return await service.google_login(payload.id_token, allowed_client_ids)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    payload: RefreshTokenRequest,
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    return await service.refresh_token(payload)
