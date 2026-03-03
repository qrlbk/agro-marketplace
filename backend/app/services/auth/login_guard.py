"""Login rate limiting and demo-login helpers."""

from fastapi import HTTPException

from app.config import settings
from app.models.user import UserRole
from app.services.redis_client import get_redis
from app.services.auth.otp import otp_lock_message

LOGIN_RATELIMIT_PHONE_PREFIX = "ratelimit:login:phone:"
LOGIN_RATELIMIT_IP_PREFIX = "ratelimit:login:ip:"
DEMO_LOGIN_RL_IP_PREFIX = "ratelimit:demo-login:ip:"


async def is_login_blocked(phone: str, client_ip: str) -> bool:
    r = await get_redis()
    phone_key = f"{LOGIN_RATELIMIT_PHONE_PREFIX}{phone}"
    ip_key = f"{LOGIN_RATELIMIT_IP_PREFIX}{client_ip}"
    phone_count = await r.get(phone_key)
    ip_count = await r.get(ip_key)
    if phone_count and int(phone_count) >= settings.user_login_rate_limit_per_phone:
        return True
    if ip_count and int(ip_count) >= settings.user_login_rate_limit_per_ip:
        return True
    return False


async def register_login_failure(phone: str, client_ip: str) -> None:
    r = await get_redis()
    window = settings.user_login_rate_limit_window_seconds
    phone_key = f"{LOGIN_RATELIMIT_PHONE_PREFIX}{phone}"
    ip_key = f"{LOGIN_RATELIMIT_IP_PREFIX}{client_ip}"

    attempts_phone = await r.incr(phone_key)
    if attempts_phone == 1:
        await r.expire(phone_key, window)
    if attempts_phone >= settings.user_login_rate_limit_per_phone:
        raise HTTPException(status_code=429, detail=otp_lock_message())

    attempts_ip = await r.incr(ip_key)
    if attempts_ip == 1:
        await r.expire(ip_key, window)
    if attempts_ip >= settings.user_login_rate_limit_per_ip:
        raise HTTPException(status_code=429, detail=otp_lock_message())


async def reset_login_counters(phone: str, client_ip: str) -> None:
    r = await get_redis()
    await r.delete(f"{LOGIN_RATELIMIT_PHONE_PREFIX}{phone}")
    await r.delete(f"{LOGIN_RATELIMIT_IP_PREFIX}{client_ip}")


async def check_demo_login_rate_limit(client_ip: str) -> None:
    """Raise 429 if too many demo-login attempts from this IP (brute-force protection)."""
    r = await get_redis()
    key = f"{DEMO_LOGIN_RL_IP_PREFIX}{client_ip}"
    window = getattr(settings, "demo_login_rate_limit_window_seconds", 300)
    limit = getattr(settings, "demo_login_rate_limit_per_ip", 10)
    n = await r.incr(key)
    if n == 1:
        await r.expire(key, window)
    if n > limit:
        raise HTTPException(status_code=429, detail=otp_lock_message())


def demo_role_to_user_role() -> UserRole:
    """Map demo_role config to UserRole. Never return admin."""
    r = (settings.demo_role or "farmer").strip().lower()
    if r == "user":
        return UserRole.user
    return UserRole.farmer
