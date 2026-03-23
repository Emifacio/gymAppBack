import os
import secrets
import json
from functools import lru_cache
from typing import Any
from urllib.parse import quote, urlparse, urlunparse

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _first_present_env(*names: str) -> str | None:
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return None


def _first_present_env_with_name(*names: str) -> tuple[str | None, str | None]:
    for name in names:
        value = os.getenv(name)
        if value:
            return value, name
    return None, None


def _normalize_database_url(value: str) -> str:
    normalized = value.strip()
    if normalized.startswith("postgresql+asyncpg://"):
        return normalized
    if normalized.startswith("postgres://"):
        return "postgresql+asyncpg://" + normalized[len("postgres://") :]
    if normalized.startswith("postgresql://"):
        return "postgresql+asyncpg://" + normalized[len("postgresql://") :]
    return normalized


def _build_database_url_from_pg_env() -> str | None:
    host = os.getenv("PGHOST")
    port = os.getenv("PGPORT", "5432")
    user = os.getenv("PGUSER")
    password = os.getenv("PGPASSWORD")
    database = os.getenv("PGDATABASE")
    if not all((host, user, password, database)):
        return None
    return (
        "postgresql+asyncpg://"
        f"{quote(user, safe='')}:{quote(password, safe='')}"
        f"@{host}:{port}/{quote(database, safe='')}"
    )


def _build_redis_url_from_env() -> str | None:
    host = os.getenv("REDISHOST") or os.getenv("REDIS_HOST")
    port = os.getenv("REDISPORT") or os.getenv("REDIS_PORT") or "6379"
    username = os.getenv("REDISUSER") or os.getenv("REDIS_USER")
    password = os.getenv("REDISPASSWORD") or os.getenv("REDIS_PASSWORD")
    if not host:
        return None
    if username and password:
        auth = f"{quote(username, safe='')}:{quote(password, safe='')}@"
    elif username:
        auth = f"{quote(username, safe='')}@"
    elif password:
        auth = f":{quote(password, safe='')}@"
    else:
        auth = ""
    return f"redis://{auth}{host}:{port}/0"


def _next_redis_database_url(redis_url: str) -> str:
    parsed = urlparse(redis_url)
    if parsed.scheme not in {"redis", "rediss"}:
        return redis_url
    try:
        database_index = int((parsed.path or "/0").lstrip("/"))
    except ValueError:
        return redis_url
    return urlunparse(parsed._replace(path=f"/{database_index + 1}"))


DEFAULT_DEV_CORS_ORIGINS = [
    "http://localhost:5173",
]

DEFAULT_PROD_CORS_ORIGINS = [
    "https://atlhyt.com",
    "https://www.atlhyt.com",
    # Keep the legacy Vercel frontend working during the domain migration.
    "https://gym-app-back-web.vercel.app",
]

DEFAULT_CORS_ORIGINS = [*DEFAULT_DEV_CORS_ORIGINS, *DEFAULT_PROD_CORS_ORIGINS]


def _normalize_origin_list(value: Any) -> list[str]:
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return []
        if value.startswith("[") and value.endswith("]"):
            value = json.loads(value)
        else:
            value = [item.strip() for item in value.split(",") if item.strip()]
    if isinstance(value, (list, tuple, set)):
        seen: set[str] = set()
        origins: list[str] = []
        for item in value:
            if not isinstance(item, str):
                continue
            normalized = item.strip().rstrip("/")
            if normalized and normalized not in seen:
                seen.add(normalized)
                origins.append(normalized)
        return origins
    return []


class Settings(BaseSettings):
    project_name: str = "Gym Backend"
    environment: str = "local"
    log_level: str = "INFO"
    secret_key: str | None = None
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30
    database_url: str | None = None
    database_url_source: str | None = None
    database_connect_timeout_seconds: float = 5.0
    database_command_timeout_seconds: float = 30.0
    database_startup_max_attempts: int = 5
    database_startup_initial_backoff_seconds: float = 1.0
    database_startup_max_backoff_seconds: float = 8.0
    database_startup_backoff_multiplier: float = 1.5
    database_pool_size: int = 5
    database_max_overflow: int = 10
    database_pool_timeout_seconds: float = 30.0
    database_pool_recycle_seconds: int = 1800
    database_pool_use_lifo: bool = True
    redis_url: str | None = None
    redis_url_source: str | None = None
    celery_broker_url: str | None = None
    celery_result_backend: str | None = None
    cache_ttl_seconds: int = 300
    redis_connect_timeout_seconds: float = 5.0
    cors_origins: list[str] = [*DEFAULT_CORS_ORIGINS]
    cors_origin_regex: str | None = None
    timezone: str = "UTC"
    strava_client_id: str | None = None
    strava_client_secret: str | None = None
    strava_api_base_url: str = "https://www.strava.com/api/v3"
    strava_oauth_base_url: str = "https://www.strava.com/oauth"
    strava_redirect_uri: str | None = None
    google_client_id: str | None = None
    google_client_ids: list[str] | None = None
    google_client_secret: str | None = None
    jwt_algorithm: str = "HS256"
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False
    smtp_timeout_seconds: float = 10.0
    email_from: str | None = None
    email_reply_to: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> list[str]:
        if value is None:
            return [*DEFAULT_CORS_ORIGINS]
        parsed_origins = _normalize_origin_list(value)
        if not parsed_origins:
            return [*DEFAULT_CORS_ORIGINS]
        # Always retain the app's stable frontend origins so a partial env override
        # cannot silently break the production login flow.
        return _normalize_origin_list([*DEFAULT_CORS_ORIGINS, *parsed_origins])

    @field_validator("google_client_ids", mode="before")
    @classmethod
    def parse_google_client_ids(cls, value: Any) -> list[str] | None:
        if value is None:
            return None
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return None
            return [item.strip() for item in value.split(",") if item.strip()]
        if isinstance(value, list):
            return [item.strip() for item in value if isinstance(item, str) and item.strip()]
        return None

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: Any) -> Any:
        if not isinstance(value, str):
            return value
        return _normalize_database_url(value)

    @model_validator(mode="after")
    def apply_runtime_defaults(self) -> "Settings":
        if not self.secret_key:
            self.secret_key = secrets.token_urlsafe(32)

        if not self.google_client_ids:
            self.google_client_ids = []

        if self.google_client_id:
            normalized_google_client_id = self.google_client_id.strip()
            if normalized_google_client_id and normalized_google_client_id not in self.google_client_ids:
                self.google_client_ids.append(normalized_google_client_id)

        if not self.database_url:
            database_url, database_url_source = _first_present_env_with_name(
                "DATABASE_URL",
                "POSTGRES_URL_NON_POOLING",
                "POSTGRES_URL",
                "POSTGRES_PRISMA_URL",
                "POSTGRESQL_URL",
                "DATABASE_PUBLIC_URL",
            )
            if database_url:
                self.database_url = database_url
                self.database_url_source = database_url_source
            else:
                derived_database_url = _build_database_url_from_pg_env()
                if derived_database_url:
                    self.database_url = derived_database_url
                    self.database_url_source = "PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE"
        if not self.database_url:
            raise ValueError(
                "A database URL is required. Set DATABASE_URL (or another supported "
                "Postgres URL env var) directly, or provide PGHOST, PGPORT, PGUSER, "
                "PGPASSWORD, and PGDATABASE."
            )
        self.database_url = _normalize_database_url(self.database_url)
        if not self.database_url_source:
            self.database_url_source = "settings"

        if not self.redis_url:
            redis_url, redis_url_source = _first_present_env_with_name("REDIS_URL")
            if redis_url:
                self.redis_url = redis_url
                self.redis_url_source = redis_url_source
            else:
                derived_redis_url = _build_redis_url_from_env()
                if derived_redis_url:
                    self.redis_url = derived_redis_url
                    self.redis_url_source = "REDISHOST/REDIS_HOST"
                else:
                    self.redis_url = "redis://localhost:6379/0"
                    self.redis_url_source = "fallback-localhost"
        elif not self.redis_url_source:
            self.redis_url_source = "settings"
        if not self.celery_broker_url:
            self.celery_broker_url = self.redis_url
        if not self.celery_result_backend:
            self.celery_result_backend = _next_redis_database_url(self.redis_url)
        return self

    @property
    def redis_configured(self) -> bool:
        return bool(self.redis_url) and self.redis_url_source != "fallback-localhost"

    @property
    def cache_redis_url(self) -> str | None:
        if not self.redis_configured:
            return None
        return self.redis_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
