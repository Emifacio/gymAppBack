from __future__ import annotations

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.core.config import get_settings
from app.infrastructure.database.base import Base

import app.domain.models  # noqa: F401

config = context.config
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    max_retries = 15
    retry_delay = 2
    last_exception = None

    for attempt in range(max_retries):
        try:
            async with connectable.connect() as connection:
                await connection.run_sync(do_run_migrations)
            await connectable.dispose()
            return
        except Exception as e:
            last_exception = e
            error_msg = str(e).lower()
            # Broaden matching for common startup connection issues
            is_transient = any(msg in error_msg for msg in [
                "starting up", 
                "connection refused", 
                "connect call failed",
                "multiple exceptions",
                "targetserverattributenotmatched"
            ])
            
            if is_transient:
                print(f"Database unavailable ({type(e).__name__}). Retrying in {retry_delay}s... (Attempt {attempt + 1}/{max_retries})")
                await asyncio.sleep(retry_delay)
            else:
                await connectable.dispose()
                raise e

    if last_exception:
        print(f"Failed to connect to database after {max_retries} attempts.")
        await connectable.dispose()
        raise last_exception


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

