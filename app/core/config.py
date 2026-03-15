from functools import lru_cache
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    project_name: str = "Gym Backend"
    environment: str = "local"
    log_level: str = "INFO"
    secret_key: str
    access_token_expire_minutes: int = 60
    database_url: str
    redis_url: str
    celery_broker_url: str
    celery_result_backend: str
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


@lru_cache
def get_settings() -> Settings:
    return Settings()

