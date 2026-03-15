import os
import secrets
from functools import lru_cache
from typing import Any
from urllib.parse import quote, urlparse, urlunparse

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


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
    password = os.getenv("REDISPASSWORD") or os.getenv("REDIS_PASSWORD")
    if not host:
        return None
    auth = f":{quote(password, safe='')}@" if password else ""
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


class Settings(BaseSettings):
    project_name: str = "Gym Backend"
    environment: str = "local"
    log_level: str = "INFO"
    secret_key: str | None = None
    access_token_expire_minutes: int = 60
    database_url: str | None = None
    redis_url: str | None = None
    celery_broker_url: str | None = None
    celery_result_backend: str | None = None
    cache_ttl_seconds: int = 300
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    timezone: str = "UTC"
    strava_client_id: str | None = None
    strava_client_secret: str | None = None
    strava_api_base_url: str = "https://www.strava.com/api/v3"
    jwt_algorithm: str = "HS256"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> list[str]:
        if isinstance(value, str):
            value = value.strip()
            if value.startswith("[") and value.endswith("]"):
                import json

                return json.loads(value)
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

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

        if not self.database_url:
            self.database_url = _build_database_url_from_pg_env()
        if not self.database_url:
            raise ValueError(
                "DATABASE_URL is required. Set DATABASE_URL directly or provide PGHOST, "
                "PGPORT, PGUSER, PGPASSWORD, and PGDATABASE."
            )
        self.database_url = _normalize_database_url(self.database_url)

        if not self.redis_url:
            self.redis_url = os.getenv("REDIS_URL") or _build_redis_url_from_env() or "redis://localhost:6379/0"
        if not self.celery_broker_url:
            self.celery_broker_url = self.redis_url
        if not self.celery_result_backend:
            self.celery_result_backend = _next_redis_database_url(self.redis_url)
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
