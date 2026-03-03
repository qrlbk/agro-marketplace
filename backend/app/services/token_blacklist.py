"""JWT token blacklist backed by Redis.

Tokens are identified by their `jti` claim. When blacklisted, the jti is stored
in Redis with a TTL equal to the remaining token lifetime so entries expire
automatically.
"""

from app.config import settings
from app.services.redis_client import get_redis

_PREFIX = "jwt_blacklist:"


async def blacklist_token(jti: str, remaining_seconds: int) -> None:
    """Add *jti* to the blacklist. *remaining_seconds* is time until token expiry."""
    if not settings.jwt_blacklist_enabled or not jti:
        return
    r = await get_redis()
    ttl = max(remaining_seconds, 1)
    await r.set(f"{_PREFIX}{jti}", "1", ex=ttl)


async def is_blacklisted(jti: str | None) -> bool:
    """Return True if *jti* is in the blacklist."""
    if not settings.jwt_blacklist_enabled or not jti:
        return False
    r = await get_redis()
    return bool(await r.exists(f"{_PREFIX}{jti}"))
