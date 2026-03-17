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
    
    # Print for immediate platform visibility
    print(f"🚀 Starting GymApp in {settings.environment} mode")
    print(f"🔗 Database: {_describe_service_url(settings.database_url)}")
    print(f"🔗 Redis: {_describe_service_url(settings.redis_url)}")

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

    # Initialize dependency containers
    redis_cache = RedisCache(
        settings.cache_redis_url,
        default_ttl=settings.cache_ttl_seconds,
        connect_timeout_seconds=settings.redis_connect_timeout_seconds,
    )
    app.state.redis_cache = redis_cache
    app.state.db_connected = False
    app.state.redis_connected = False

    async def background_probes():
        # Database check
        logger.info("background_probe: database_check_started")
        try:
            await wait_for_database_ready()
            app.state.db_connected = True
            logger.info("background_probe: database_check_succeeded")
            print("✅ Database connected")
        except Exception as e:
            logger.error("background_probe: database_check_failed error=%s", str(e))
            print(f"❌ Database connection failed: {e}")

        # Redis check
        logger.info("background_probe: redis_check_started")
        try:
            await redis_cache.connect()
            if redis_cache.client:
                app.state.redis_connected = True
                logger.info("background_probe: redis_check_succeeded")
                print("✅ Redis connected")
            else:
                logger.warning("background_probe: redis_check_failed_degraded_mode")
                print("⚠️ Redis in degraded mode")
        except Exception as e:
            logger.error("background_probe: redis_check_error error=%s", str(e))
            print(f"⚠️ Redis probe error: {e}")

    # Kick off probes in background
    import asyncio
    asyncio.create_task(background_probes())

    logger.info("startup_phase: lifespan_yielding_immediately")
    yield
    
    logger.info("startup_phase: shutting_down")
    await redis_cache.close()
    await dispose_database_engine()
    logger.info("startup_phase: cleanup_complete")


app = FastAPI(
    title=settings.project_name,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Outermost: CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://gym-app-back-web.vercel.app",
        "https://gym-app-back-web.vercel.app/",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middle: Readiness Check
@app.middleware("http")
async def readiness_middleware(request: Request, call_next):
    # Skip for health and docs
    if request.url.path in ("/health", "/docs", "/redoc", "/openapi.json"):
        return await call_next(request)
    
    # Check if DB is ready
    if not getattr(request.app.state, "db_connected", False):
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=503,
            content={
                "detail": "Service is starting up. Connecting to database...",
                "code": "service_starting"
            },
            headers={"Retry-After": "5"}
        )
    return await call_next(request)

app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(IntegrityError, integrity_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

app.include_router(api_router)


@app.get("/health", tags=["health"])
async def healthcheck(request: Request) -> dict[str, Any]:
    return {
        "status": "ok" if request.app.state.db_connected else "connecting",
        "database": "connected" if request.app.state.db_connected else "pending",
        "redis": "connected" if request.app.state.redis_connected else "pending",
        "environment": settings.environment
    }
