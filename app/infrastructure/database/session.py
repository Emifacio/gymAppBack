import asyncio
from collections.abc import AsyncGenerator
import logging
import time
from urllib.parse import urlparse

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


def _describe_database_target(url: str | None) -> str:
    if not url:
        return "unset"
    parsed = urlparse(url)
    host = parsed.hostname or "unknown-host"
    port = parsed.port
    target = f"{host}:{port}" if port else host
    if parsed.scheme:
        return f"{parsed.scheme}://{target}"
    return target

engine = create_async_engine(
    settings.database_url,
    echo=False,
    future=True,
    pool_pre_ping=True,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    pool_timeout=settings.database_pool_timeout_seconds,
    pool_recycle=settings.database_pool_recycle_seconds,
    pool_use_lifo=settings.database_pool_use_lifo,
    connect_args={
        "timeout": settings.database_connect_timeout_seconds,
        "command_timeout": settings.database_command_timeout_seconds,
    },
)
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def probe_database() -> None:
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))


async def wait_for_database_ready() -> None:
    max_attempts = max(1, settings.database_startup_max_attempts)
    next_delay_seconds = max(0.1, settings.database_startup_initial_backoff_seconds)
    last_error: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        started_at = time.perf_counter()
        try:
            await asyncio.wait_for(
                probe_database(),
                timeout=settings.database_connect_timeout_seconds + 1,
            )
        except Exception as exc:  # pragma: no cover - startup integration path
            elapsed_seconds = time.perf_counter() - started_at
            last_error = exc
            delay_seconds = min(
                next_delay_seconds,
                settings.database_startup_max_backoff_seconds,
            )
            logger.warning(
                "database_startup_probe_failed attempt=%s max_attempts=%s target=%s "
                "elapsed_seconds=%.2f next_delay_seconds=%.2f",
                attempt,
                max_attempts,
                _describe_database_target(settings.database_url),
                elapsed_seconds,
                0.0 if attempt >= max_attempts else delay_seconds,
                exc_info=True,
            )
            if attempt >= max_attempts:
                break
            await asyncio.sleep(delay_seconds)
            next_delay_seconds = min(
                delay_seconds * settings.database_startup_backoff_multiplier,
                settings.database_startup_max_backoff_seconds,
            )
        else:
            elapsed_seconds = time.perf_counter() - started_at
            logger.info(
                "database_startup_probe_succeeded attempt=%s target=%s elapsed_seconds=%.2f",
                attempt,
                _describe_database_target(settings.database_url),
                elapsed_seconds,
            )
            return

    raise RuntimeError(
        "Database was not ready before the startup retry budget was exhausted."
    ) from last_error


async def dispose_database_engine() -> None:
    await engine.dispose()
