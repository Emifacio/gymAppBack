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
from app.infrastructure.database.session import dispose_database_engine, wait_for_database_ready

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


def _uses_railway_private_network(url: str | None) -> bool:
    if not url:
        return False
    parsed = urlparse(url)
    host = parsed.hostname or ""
    return host.endswith(".railway.internal")


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(settings.log_level)
    logger.info(
        "database_configuration_selected source=%s target=%s connect_timeout_seconds=%s "
        "pool_size=%s max_overflow=%s max_attempts=%s",
        settings.database_url_source or "unknown",
        _describe_service_url(settings.database_url),
        settings.database_connect_timeout_seconds,
        settings.database_pool_size,
        settings.database_max_overflow,
        settings.database_startup_max_attempts,
    )
    if settings.database_url_source == "DATABASE_PUBLIC_URL":
        logger.warning(
            "database_configuration_uses_public_railway_url source=%s target=%s",
            settings.database_url_source,
            _describe_service_url(settings.database_url),
        )
    elif settings.environment != "local" and not _uses_railway_private_network(settings.database_url):
        logger.info(
            "database_configuration_non_private_target source=%s target=%s",
            settings.database_url_source or "unknown",
            _describe_service_url(settings.database_url),
        )
    await wait_for_database_ready()
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
    redis_cache = RedisCache(
        settings.cache_redis_url,
        default_ttl=settings.cache_ttl_seconds,
        connect_timeout_seconds=settings.redis_connect_timeout_seconds,
    )
    await redis_cache.connect()
    app.state.redis_cache = redis_cache
    yield
    await redis_cache.close()
    await dispose_database_engine()


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
    allow_origin_regex=settings.cors_origin_regex,
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
