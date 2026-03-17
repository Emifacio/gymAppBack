import asyncio
import json
import logging
import time
from typing import Any

from redis.asyncio import Redis


logger = logging.getLogger(__name__)


class RedisCache:
    def __init__(
        self,
        redis_url: str | None,
        default_ttl: int = 300,
        connect_timeout_seconds: float = 5.0,
    ) -> None:
        self.redis_url = redis_url
        self.default_ttl = default_ttl
        self.connect_timeout_seconds = connect_timeout_seconds
        self.client: Redis | None = None

    async def connect(self) -> None:
        if not self.redis_url:
            logger.info("redis_connection_skipped")
            return
        started_at = time.perf_counter()
        try:
            self.client = Redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=self.connect_timeout_seconds,
                socket_timeout=self.connect_timeout_seconds,
            )
            # Use a ping to verify connectivity
            await asyncio.wait_for(self.client.ping(), timeout=self.connect_timeout_seconds)
        except (asyncio.TimeoutError, Exception) as e:
            elapsed_seconds = time.perf_counter() - started_at
            logger.warning(
                "redis_connection_failed reason=%s timeout_seconds=%s elapsed_seconds=%.2f. Falling back to no-cache mode.",
                str(e) or type(e).__name__,
                self.connect_timeout_seconds,
                elapsed_seconds,
            )
            self.client = None
        else:
            elapsed_seconds = time.perf_counter() - started_at
            logger.info("redis_connection_established elapsed_seconds=%.2f", elapsed_seconds)

    async def close(self) -> None:
        if self.client is not None:
            if hasattr(self.client, "aclose"):
                await self.client.aclose()
            else:
                await self.client.close()

    async def get_json(self, key: str) -> dict[str, Any] | list[Any] | None:
        if self.client is None:
            return None
        value = await self.client.get(key)
        return None if value is None else json.loads(value)

    async def set_json(self, key: str, payload: Any, ttl: int | None = None) -> None:
        if self.client is None:
            return
        await self.client.set(key, json.dumps(payload), ex=ttl or self.default_ttl)

    async def delete(self, *keys: str) -> None:
        if self.client is None or not keys:
            return
        await self.client.delete(*keys)
