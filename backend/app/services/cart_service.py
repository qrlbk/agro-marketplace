"""Shared Redis cart logic for cart and checkout routers."""
import json
import logging

from app.services.redis_client import get_redis

logger = logging.getLogger(__name__)

CART_PREFIX = "cart:"
CART_TTL = 86400 * 7  # 7 days


class CartUnavailableError(Exception):
    """Raised when cart backend (Redis) is unavailable for write operations."""


async def get_cart(user_id: int) -> list[dict]:
    try:
        r = await get_redis()
        key = f"{CART_PREFIX}{user_id}"
        data = await r.get(key)
    except Exception as e:
        logger.warning("Cart get_cart Redis error for user_id=%s: %s", user_id, e)
        return []
    if not data:
        return []
    try:
        return json.loads(data)
    except json.JSONDecodeError as e:
        logger.warning("Cart get_cart invalid JSON for user_id=%s: %s", user_id, e)
        return []


async def set_cart(user_id: int, items: list[dict], ttl: int = CART_TTL) -> None:
    try:
        r = await get_redis()
        key = f"{CART_PREFIX}{user_id}"
        await r.set(key, json.dumps(items), ex=ttl)
    except Exception as e:
        logger.error("Cart set_cart Redis error for user_id=%s: %s", user_id, e)
        raise CartUnavailableError("Cart storage temporarily unavailable") from e


async def clear_cart(user_id: int) -> None:
    try:
        r = await get_redis()
        await r.delete(f"{CART_PREFIX}{user_id}")
    except Exception as e:
        logger.error("Cart clear_cart Redis error for user_id=%s: %s", user_id, e)
        raise CartUnavailableError("Cart storage temporarily unavailable") from e
