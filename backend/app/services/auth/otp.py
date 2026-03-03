"""OTP generation, storage, rate limiting and verification helpers."""

import asyncio
import hashlib
import hmac
import logging
import secrets
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.services.redis_client import get_redis
from app.services.audit import write_audit_log

logger = logging.getLogger(__name__)

OTP_RATELIMIT_PHONE_PREFIX = "ratelimit:otp:phone:"
OTP_RATELIMIT_IP_PREFIX = "ratelimit:otp:ip:"
OTP_VERIFY_RL_PHONE_PREFIX = "ratelimit:otp-verify:phone:"
OTP_VERIFY_RL_IP_PREFIX = "ratelimit:otp-verify:ip:"
OTP_FAIL_PHONE_PREFIX = "otpfail:phone:"
OTP_FAIL_IP_PREFIX = "otpfail:ip:"

OTP_KEY_PREFIX = "otp:"
OTP_LENGTH = 6
OTP_TTL = 60 * settings.otp_expire_minutes


def _otp_secret_bytes() -> bytes:
    secret = (settings.otp_code_secret or settings.jwt_secret or "").strip()
    return secret.encode("utf-8")


def hash_otp_code(code: str) -> str:
    digest = hmac.new(_otp_secret_bytes(), code.encode("utf-8"), hashlib.sha256)
    return digest.hexdigest()


def generate_otp_code() -> str:
    value = secrets.randbelow(10 ** OTP_LENGTH)
    return str(value).zfill(OTP_LENGTH)


def otp_lock_message() -> str:
    return "Слишком много попыток. Попробуйте позже."


async def save_hashed_otp(phone: str, code_hash: str) -> None:
    r = await get_redis()
    key = f"{OTP_KEY_PREFIX}{phone}"
    await r.set(key, code_hash, ex=OTP_TTL)


async def load_hashed_otp(phone: str) -> str | None:
    r = await get_redis()
    key = f"{OTP_KEY_PREFIX}{phone}"
    return await r.get(key)


async def delete_hashed_otp(phone: str) -> None:
    r = await get_redis()
    await r.delete(f"{OTP_KEY_PREFIX}{phone}")


async def check_otp_verify_rate_limit(phone: str, client_ip: str) -> None:
    r = await get_redis()
    window = settings.otp_verify_rate_limit_window_seconds
    phone_key = f"{OTP_VERIFY_RL_PHONE_PREFIX}{phone}"
    ip_key = f"{OTP_VERIFY_RL_IP_PREFIX}{client_ip}"

    n_phone = await r.incr(phone_key)
    if n_phone == 1:
        await r.expire(phone_key, window)
    if n_phone > settings.otp_verify_rate_limit_per_phone:
        raise HTTPException(status_code=429, detail=otp_lock_message())

    n_ip = await r.incr(ip_key)
    if n_ip == 1:
        await r.expire(ip_key, window)
    if n_ip > settings.otp_verify_rate_limit_per_ip:
        raise HTTPException(status_code=429, detail=otp_lock_message())


async def ensure_otp_not_blocked(phone: str, client_ip: str) -> None:
    r = await get_redis()
    limit = settings.otp_verify_max_attempts
    phone_key = f"{OTP_FAIL_PHONE_PREFIX}{phone}"
    ip_key = f"{OTP_FAIL_IP_PREFIX}{client_ip}"
    phone_count = await r.get(phone_key)
    ip_count = await r.get(ip_key)
    if (phone_count and int(phone_count) >= limit) or (ip_count and int(ip_count) >= limit):
        raise HTTPException(status_code=429, detail=otp_lock_message())


async def register_otp_failure(phone: str, client_ip: str) -> None:
    r = await get_redis()
    limit = settings.otp_verify_max_attempts
    phone_key = f"{OTP_FAIL_PHONE_PREFIX}{phone}"
    ip_key = f"{OTP_FAIL_IP_PREFIX}{client_ip}"

    phone_attempts = await r.incr(phone_key)
    if phone_attempts == 1:
        await r.expire(phone_key, OTP_TTL)
    if phone_attempts >= limit:
        raise HTTPException(status_code=429, detail=otp_lock_message())

    ip_attempts = await r.incr(ip_key)
    if ip_attempts == 1:
        await r.expire(ip_key, OTP_TTL)
    if ip_attempts >= limit:
        raise HTTPException(status_code=429, detail=otp_lock_message())


async def reset_otp_failure_counters(phone: str, client_ip: str) -> None:
    r = await get_redis()
    await r.delete(f"{OTP_FAIL_PHONE_PREFIX}{phone}")
    await r.delete(f"{OTP_FAIL_IP_PREFIX}{client_ip}")


async def check_otp_rate_limit(phone: str, client_ip: str) -> None:
    """Raise HTTPException 429 if rate limit exceeded for phone or IP."""
    r = await get_redis()
    window = settings.otp_rate_limit_window_seconds
    phone_key = f"{OTP_RATELIMIT_PHONE_PREFIX}{phone}"
    ip_key = f"{OTP_RATELIMIT_IP_PREFIX}{client_ip}"

    n_phone = await r.incr(phone_key)
    if n_phone == 1:
        await r.expire(phone_key, window)
    if n_phone > settings.otp_rate_limit_per_phone:
        logger.warning("OTP rate limit exceeded for phone (attempts=%s)", n_phone)
        raise HTTPException(
            status_code=429,
            detail="Слишком много запросов кода. Попробуйте позже.",
        )

    n_ip = await r.incr(ip_key)
    if n_ip == 1:
        await r.expire(ip_key, window)
    if n_ip > settings.otp_rate_limit_per_ip:
        logger.warning("OTP rate limit exceeded for IP (attempts=%s)", n_ip)
        raise HTTPException(
            status_code=429,
            detail="Слишком много запросов кода. Попробуйте позже.",
        )


async def raise_invalid_otp_code(phone: str, client_ip: str, db: AsyncSession) -> None:
    """Register OTP failure, write audit log, optional delay, then raise 400."""
    try:
        await register_otp_failure(phone, client_ip)
    except HTTPException as exc:
        raise exc
    await write_audit_log(
        db, None, None, "otp_verify_failed",
        details={"phone": phone, "ip": client_ip}, ip=client_ip,
    )
    r = await get_redis()
    attempts_raw = await r.get(f"{OTP_FAIL_PHONE_PREFIX}{phone}")
    attempts = int(attempts_raw) if attempts_raw else 1
    delay = min(2 ** (attempts - 1), 30)
    await asyncio.sleep(delay)
    raise HTTPException(status_code=400, detail="Неверный или просроченный код")
