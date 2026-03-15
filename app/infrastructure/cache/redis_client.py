import json
import logging
from typing import Any

from redis.asyncio import Redis


logger = logging.getLogger(__name__)


class RedisCache:
    def __init__(self, redis_url: str, default_ttl: int = 300) -> None:
        self.redis_url = redis_url
        self.default_ttl = default_ttl
        self.client: Redis | None = None

    async def connect(self) -> None:
        try:
            self.client = Redis.from_url(self.redis_url, encoding="utf-8", decode_responses=True)
            await self.client.ping()
        except Exception:
            logger.warning("redis_connection_failed", exc_info=True)
            self.client = None

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
