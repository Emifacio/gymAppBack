from contextlib import asynccontextmanager
import logging
from urllib.parse import urlparse

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError

from app.api.exception_handlers import (
    app_exception_handler,
    integrity_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.api.router import api_router
from app.core.config import get_settings
from app.core.exceptions import AppException
from app.core.logging import setup_logging
from app.infrastructure.cache.redis_client import RedisCache

settings = get_settings()
logger = logging.getLogger(__name__)


def _describe_service_url(url: str | None) -> str:
    if not url:
        return "unset"
    parsed = urlparse(url)
    host = parsed.hostname or "unknown-host"
    port = parsed.port
    target = f"{host}:{port}" if port else host
    if parsed.scheme:
        return f"{parsed.scheme}://{target}"
    return target


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(settings.log_level)
    if settings.redis_configured:
        logger.info(
            "redis_configuration_selected source=%s target=%s",
            settings.redis_url_source or "unknown",
            _describe_service_url(settings.redis_url),
        )
    else:
        logger.warning(
            "redis_configuration_missing source=%s background_jobs_available=false cache_available=false",
            settings.redis_url_source or "unknown",
        )
    redis_cache = RedisCache(settings.cache_redis_url, default_ttl=settings.cache_ttl_seconds)
    await redis_cache.connect()
    app.state.redis_cache = redis_cache
    yield
    await redis_cache.close()


app = FastAPI(
    title=settings.project_name,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(IntegrityError, integrity_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

app.include_router(api_router)


@app.get("/health", tags=["health"])
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
