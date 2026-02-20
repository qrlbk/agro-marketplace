"""Shared Redis cart logic for cart and checkout routers."""
import json
from app.services.redis_client import get_redis

CART_PREFIX = "cart:"
CART_TTL = 86400 * 7  # 7 days


async def get_cart(user_id: int) -> list[dict]:
    try:
        r = await get_redis()
        key = f"{CART_PREFIX}{user_id}"
        data = await r.get(key)
    except Exception:
        return []
    if not data:
        return []
    try:
        return json.loads(data)
    except json.JSONDecodeError:
        return []


async def set_cart(user_id: int, items: list[dict], ttl: int = CART_TTL) -> None:
    try:
        r = await get_redis()
        key = f"{CART_PREFIX}{user_id}"
        await r.set(key, json.dumps(items), ex=ttl)
    except Exception:
        pass


async def clear_cart(user_id: int) -> None:
    try:
        r = await get_redis()
        await r.delete(f"{CART_PREFIX}{user_id}")
    except Exception:
        pass
