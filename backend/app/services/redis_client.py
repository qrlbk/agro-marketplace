import json
from typing import Any
import redis.asyncio as redis
from app.config import settings

_redis: redis.Redis | None = None


async def get_redis() -> redis.Redis:
    global _redis
    if _redis is None:
        _redis = redis.from_url(settings.redis_url, decode_responses=True)
    return _redis


def cache_key_prefix() -> str:
    return "catalog:"


async def cache_get(key: str) -> Any | None:
    try:
        r = await get_redis()
        data = await r.get(key)
    except Exception:
        return None
    if data is None:
        return None
    try:
        return json.loads(data)
    except json.JSONDecodeError:
        return data


async def cache_set(key: str, value: Any, ttl: int | None = None) -> None:
    try:
        r = await get_redis()
        ttl = ttl or settings.cache_ttl_seconds
        if isinstance(value, (dict, list)):
            value = json.dumps(value, default=str)
        await r.set(key, value, ex=ttl)
    except Exception:
        pass


async def cache_invalidate_pattern(pattern: str) -> None:
    try:
        r = await get_redis()
        keys = []
        async for k in r.scan_iter(match=pattern):
            keys.append(k)
        if keys:
            await r.delete(*keys)
    except Exception:
        pass


async def invalidate_product_cache() -> None:
    """Invalidate all catalog/product cache keys. Call after any product or catalog change."""
    await cache_invalidate_pattern(f"{cache_key_prefix()}*")
