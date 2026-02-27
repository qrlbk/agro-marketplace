import asyncio
import hashlib
import hmac
import logging
import secrets
from datetime import datetime, timedelta
from passlib.context import CryptContext
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User, UserRole
from app.models.company import Company, CompanyStatus
from app.models.company_member import CompanyMember, CompanyRole
from app.config import settings
from app.schemas.auth import (
    RequestOTPIn,
    VerifyOTPIn,
    DemoLoginIn,
    PasswordLoginIn,
    SetPasswordIn,
    TokenOut,
)
from app.schemas.user import UserOut, ProfileUpdateIn
from app.schemas.onboarding import OnboardingIn
from app.services.redis_client import get_redis
from app.services.sms import sms_gateway
from app.services.bin_lookup import lookup_bin
from app.dependencies import get_current_user, get_client_ip
from app.constants.regions import validate_region
from app.utils.sanitize import sanitize_text

router = APIRouter()
logger = logging.getLogger(__name__)

OTP_RATELIMIT_PHONE_PREFIX = "ratelimit:otp:phone:"
OTP_RATELIMIT_IP_PREFIX = "ratelimit:otp:ip:"
OTP_VERIFY_RL_PHONE_PREFIX = "ratelimit:otp-verify:phone:"
OTP_VERIFY_RL_IP_PREFIX = "ratelimit:otp-verify:ip:"
OTP_FAIL_PHONE_PREFIX = "otpfail:phone:"
OTP_FAIL_IP_PREFIX = "otpfail:ip:"
DEMO_LOGIN_RL_IP_PREFIX = "ratelimit:demo-login:ip:"
LOGIN_RATELIMIT_PHONE_PREFIX = "ratelimit:login:phone:"
LOGIN_RATELIMIT_IP_PREFIX = "ratelimit:login:ip:"

pwd_ctx = CryptContext(schemes=["bcrypt"])


def _validate_user_password(password: str) -> None:
    min_len = settings.user_password_min_length
    if len(password) < min_len:
        raise HTTPException(
            status_code=400,
            detail=f"Пароль должен содержать минимум {min_len} символов.",
        )
    if not any(c.isalpha() for c in password):
        raise HTTPException(status_code=400, detail="Пароль должен содержать буквы.")
    if not any(c.isdigit() for c in password):
        raise HTTPException(status_code=400, detail="Пароль должен содержать цифры.")


def _ensure_valid_region(region: str | None) -> None:
    """Raise 400 if region is set but not in the allowed list."""
    if region is not None and str(region).strip() and not validate_region(region):
        raise HTTPException(
            status_code=400,
            detail="Недопустимый регион. Выберите регион из списка.",
        )


def _otp_secret_bytes() -> bytes:
    secret = (settings.otp_code_secret or settings.jwt_secret or "").strip()
    return secret.encode("utf-8")


def _hash_otp_code(code: str) -> str:
    digest = hmac.new(_otp_secret_bytes(), code.encode("utf-8"), hashlib.sha256)
    return digest.hexdigest()


def _generate_otp_code() -> str:
    value = secrets.randbelow(10 ** OTP_LENGTH)
    return str(value).zfill(OTP_LENGTH)

OTP_KEY_PREFIX = "otp:"
OTP_LENGTH = 6
OTP_TTL = 60 * settings.otp_expire_minutes


def _otp_lock_message() -> str:
    return "Слишком много попыток. Попробуйте позже."


async def _save_hashed_otp(phone: str, code_hash: str) -> None:
    r = await get_redis()
    key = f"{OTP_KEY_PREFIX}{phone}"
    await r.set(key, code_hash, ex=OTP_TTL)


async def _load_hashed_otp(phone: str) -> str | None:
    r = await get_redis()
    key = f"{OTP_KEY_PREFIX}{phone}"
    return await r.get(key)


async def _delete_hashed_otp(phone: str) -> None:
    r = await get_redis()
    await r.delete(f"{OTP_KEY_PREFIX}{phone}")


async def _check_otp_verify_rate_limit(phone: str, client_ip: str) -> None:
    r = await get_redis()
    window = settings.otp_verify_rate_limit_window_seconds
    phone_key = f"{OTP_VERIFY_RL_PHONE_PREFIX}{phone}"
    ip_key = f"{OTP_VERIFY_RL_IP_PREFIX}{client_ip}"

    n_phone = await r.incr(phone_key)
    if n_phone == 1:
        await r.expire(phone_key, window)
    if n_phone > settings.otp_verify_rate_limit_per_phone:
        raise HTTPException(status_code=429, detail=_otp_lock_message())

    n_ip = await r.incr(ip_key)
    if n_ip == 1:
        await r.expire(ip_key, window)
    if n_ip > settings.otp_verify_rate_limit_per_ip:
        raise HTTPException(status_code=429, detail=_otp_lock_message())


async def _ensure_otp_not_blocked(phone: str, client_ip: str) -> None:
    r = await get_redis()
    limit = settings.otp_verify_max_attempts
    phone_key = f"{OTP_FAIL_PHONE_PREFIX}{phone}"
    ip_key = f"{OTP_FAIL_IP_PREFIX}{client_ip}"
    phone_count = await r.get(phone_key)
    ip_count = await r.get(ip_key)
    if (phone_count and int(phone_count) >= limit) or (ip_count and int(ip_count) >= limit):
        raise HTTPException(status_code=429, detail=_otp_lock_message())


async def _register_otp_failure(phone: str, client_ip: str) -> None:
    r = await get_redis()
    limit = settings.otp_verify_max_attempts
    phone_key = f"{OTP_FAIL_PHONE_PREFIX}{phone}"
    ip_key = f"{OTP_FAIL_IP_PREFIX}{client_ip}"

    phone_attempts = await r.incr(phone_key)
    if phone_attempts == 1:
        await r.expire(phone_key, OTP_TTL)
    if phone_attempts >= limit:
        raise HTTPException(status_code=429, detail=_otp_lock_message())

    ip_attempts = await r.incr(ip_key)
    if ip_attempts == 1:
        await r.expire(ip_key, OTP_TTL)
    if ip_attempts >= limit:
        raise HTTPException(status_code=429, detail=_otp_lock_message())


async def _reset_otp_failure_counters(phone: str, client_ip: str) -> None:
    r = await get_redis()
    await r.delete(f"{OTP_FAIL_PHONE_PREFIX}{phone}")
    await r.delete(f"{OTP_FAIL_IP_PREFIX}{client_ip}")


async def _is_login_blocked(phone: str, client_ip: str) -> bool:
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


async def _register_login_failure(phone: str, client_ip: str) -> None:
    r = await get_redis()
    window = settings.user_login_rate_limit_window_seconds
    phone_key = f"{LOGIN_RATELIMIT_PHONE_PREFIX}{phone}"
    ip_key = f"{LOGIN_RATELIMIT_IP_PREFIX}{client_ip}"

    attempts_phone = await r.incr(phone_key)
    if attempts_phone == 1:
        await r.expire(phone_key, window)
    if attempts_phone >= settings.user_login_rate_limit_per_phone:
        raise HTTPException(status_code=429, detail=_otp_lock_message())

    attempts_ip = await r.incr(ip_key)
    if attempts_ip == 1:
        await r.expire(ip_key, window)
    if attempts_ip >= settings.user_login_rate_limit_per_ip:
        raise HTTPException(status_code=429, detail=_otp_lock_message())


async def _reset_login_counters(phone: str, client_ip: str) -> None:
    r = await get_redis()
    await r.delete(f"{LOGIN_RATELIMIT_PHONE_PREFIX}{phone}")
    await r.delete(f"{LOGIN_RATELIMIT_IP_PREFIX}{client_ip}")


MARKETPLACE_JWT_ISSUER = "marketplace"


def create_access_token(user_id: int, role: UserRole, phone: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_access_expire_minutes)
    payload = {
        "sub": str(user_id),
        "role": role.value,
        "phone": phone,
        "exp": expire,
        "iss": MARKETPLACE_JWT_ISSUER,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


async def _check_otp_rate_limit(phone: str, client_ip: str) -> None:
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


@router.post("/request-otp")
async def request_otp(
    body: RequestOTPIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    client_ip = get_client_ip(request) or "0.0.0.0"
    await _check_otp_rate_limit(body.phone, client_ip)

    code = _generate_otp_code()
    await _save_hashed_otp(body.phone, _hash_otp_code(code))
    await sms_gateway.send(body.phone, f"Код для входа: {code}")
    return {"message": "OTP sent"}


async def _raise_invalid_code(phone: str, client_ip: str) -> None:
    try:
        await _register_otp_failure(phone, client_ip)
    except HTTPException as exc:
        raise exc
    await asyncio.sleep(1)
    raise HTTPException(status_code=400, detail="Неверный или просроченный код")


@router.post("/verify-otp", response_model=TokenOut)
async def verify_otp(
    body: VerifyOTPIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    client_ip = get_client_ip(request) or "0.0.0.0"
    await _check_otp_verify_rate_limit(body.phone, client_ip)
    await _ensure_otp_not_blocked(body.phone, client_ip)
    stored = await _load_hashed_otp(body.phone)
    if not stored:
        await _raise_invalid_code(body.phone, client_ip)
    else:
        candidate = _hash_otp_code(body.code)
        if not hmac.compare_digest(stored, candidate):
            await _raise_invalid_code(body.phone, client_ip)
        await _delete_hashed_otp(body.phone)
        await _reset_otp_failure_counters(body.phone, client_ip)
    result = await db.execute(select(User).where(User.phone == body.phone))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(role=UserRole.guest, phone=body.phone)
        db.add(user)
        await db.flush()
        await db.refresh(user)
    token = create_access_token(user.id, user.role, user.phone)
    return TokenOut(access_token=token)


# Демо-вход по паролю: пароль и роль для тестовых номеров (пользователь создаётся, если нет в БД)
DEMO_CREDENTIALS: dict[str, tuple[str, UserRole]] = {
    "+77001112233": ("admin", UserRole.admin),
    "+77009998877": ("user", UserRole.farmer),
}


def _normalize_phone(phone: str) -> str:
    p = (phone or "").strip().replace(" ", "").replace("-", "")
    if p and not p.startswith("+"):
        p = "+" + p
    return p


def _is_production() -> bool:
    return (settings.environment or "").strip().lower() in ("prod", "production")


async def _check_demo_login_rate_limit(client_ip: str) -> None:
    """Raise 429 if too many demo-login attempts from this IP (brute-force protection)."""
    r = await get_redis()
    key = f"{DEMO_LOGIN_RL_IP_PREFIX}{client_ip}"
    window = getattr(settings, "demo_login_rate_limit_window_seconds", 300)
    limit = getattr(settings, "demo_login_rate_limit_per_ip", 10)
    n = await r.incr(key)
    if n == 1:
        await r.expire(key, window)
    if n > limit:
        raise HTTPException(status_code=429, detail=_otp_lock_message())


@router.post("/demo-login", response_model=TokenOut)
async def demo_login(
    body: DemoLoginIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    if _is_production():
        raise HTTPException(status_code=404, detail="Not found")
    if not settings.demo_auth_enabled:
        raise HTTPException(status_code=404, detail="Демо-вход отключён.")
    client_ip = get_client_ip(request) or "0.0.0.0"
    await _check_demo_login_rate_limit(client_ip)
    phone = _normalize_phone(body.phone)
    password = (body.password or "").strip()
    if phone not in DEMO_CREDENTIALS or DEMO_CREDENTIALS[phone][0] != password:
        raise HTTPException(status_code=400, detail="Неверный телефон или пароль.")
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    if user is None:
        # Создаём демо-пользователя, чтобы вход работал без seed
        role = DEMO_CREDENTIALS[phone][1]
        name = "Admin" if role == UserRole.admin else "Farmer"
        user = User(role=role, phone=phone, name=name)
        db.add(user)
        await db.flush()
        await db.refresh(user)
    token = create_access_token(user.id, user.role, user.phone)
    return TokenOut(access_token=token)


@router.post("/login-password", response_model=TokenOut)
async def login_with_password(
    body: PasswordLoginIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    client_ip = get_client_ip(request) or "0.0.0.0"
    if await _is_login_blocked(body.phone, client_ip):
        raise HTTPException(status_code=429, detail=_otp_lock_message())
    password = (body.password or "").strip()
    if not password:
        raise HTTPException(status_code=400, detail="Пароль обязателен.")
    result = await db.execute(select(User).where(User.phone == body.phone))
    user = result.scalar_one_or_none()
    if user is None or not user.password_hash:
        await _register_login_failure(body.phone, client_ip)
        raise HTTPException(status_code=400, detail="Неверный телефон или пароль.")
    if not pwd_ctx.verify(password, user.password_hash):
        await _register_login_failure(body.phone, client_ip)
        raise HTTPException(status_code=400, detail="Неверный телефон или пароль.")
    await _reset_login_counters(body.phone, client_ip)
    token = create_access_token(user.id, user.role, user.phone)
    return TokenOut(access_token=token)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return UserOut(
        id=current_user.id,
        role=current_user.role,
        phone=current_user.phone,
        name=current_user.name,
        region=current_user.region,
        company_id=current_user.company_id,
        company_details=current_user.company_details,
        company_status=current_user.company.status.value if current_user.company else None,
        company_role=current_user.company_membership.company_role.value if current_user.company_membership else None,
        chat_storage_opt_in=current_user.chat_storage_opt_in,
        has_password=bool(current_user.password_hash),
    )


@router.post("/set-password")
async def set_password(
    body: SetPasswordIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_password = (body.new_password or "").strip()
    _validate_user_password(new_password)
    if current_user.password_hash:
        current = (body.current_password or "").strip()
        if not current:
            raise HTTPException(status_code=400, detail="Текущий пароль обязателен.")
        if not pwd_ctx.verify(current, current_user.password_hash):
            raise HTTPException(status_code=400, detail="Текущий пароль неверен.")
    current_user.password_hash = pwd_ctx.hash(new_password)
    await db.flush()
    await db.refresh(current_user)
    return {"message": "Пароль обновлён"}


@router.patch("/me", response_model=UserOut)
async def update_me(
    body: ProfileUpdateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update current user profile (name, region). Region must be from the allowed list."""
    if body.name is not None:
        current_user.name = sanitize_text(body.name, max_length=255)
    if body.region is not None:
        _ensure_valid_region(body.region)
        current_user.region = (body.region or "").strip() or None
    if body.chat_storage_opt_in is not None:
        current_user.chat_storage_opt_in = body.chat_storage_opt_in
    await db.flush()
    await db.refresh(current_user)
    return UserOut(
        id=current_user.id,
        role=current_user.role,
        phone=current_user.phone,
        name=current_user.name,
        region=current_user.region,
        company_id=current_user.company_id,
        company_details=current_user.company_details,
        company_status=current_user.company.status.value if current_user.company else None,
        company_role=current_user.company_membership.company_role.value if current_user.company_membership else None,
        chat_storage_opt_in=current_user.chat_storage_opt_in,
        has_password=bool(current_user.password_hash),
    )


@router.get("/bin-lookup")
async def bin_lookup_endpoint(
    bin_query: str = Query(..., min_length=10, max_length=12, alias="bin"),
    current_user: User = Depends(get_current_user),
):
    """Look up company data by BIN. Returns name, legal_address, chairman_name. Never fails with 500."""
    result = await lookup_bin(bin_query)
    return result


@router.post("/onboarding", response_model=UserOut)
async def onboarding(
    body: OnboardingIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.guest:
        raise HTTPException(status_code=400, detail="Onboarding already completed")
    bin_clean = (body.bin or "").strip().replace(" ", "") if body.bin else ""

    if body.role == UserRole.user:
        _ensure_valid_region(body.region)
        current_user.role = UserRole.user
        current_user.name = body.name or current_user.name
        current_user.region = (body.region or "").strip() or None
        await db.flush()
        await db.refresh(current_user)
        return UserOut(
            id=current_user.id,
            role=current_user.role,
            phone=current_user.phone,
            name=current_user.name,
            region=current_user.region,
            company_id=current_user.company_id,
            company_details=current_user.company_details,
            company_status=None,
            company_role=current_user.company_membership.company_role.value if current_user.company_membership else None,
            chat_storage_opt_in=current_user.chat_storage_opt_in,
            has_password=bool(current_user.password_hash),
        )

    if body.role == UserRole.farmer:
        if not bin_clean:
            raise HTTPException(status_code=400, detail="БИН обязателен для фермера")
        _ensure_valid_region(body.region)
        result = await db.execute(select(Company).where(Company.bin == bin_clean))
        company = result.scalar_one_or_none()
        if not company:
            company = Company(
                bin=bin_clean,
                name=body.company_name,
                legal_address=body.legal_address,
                chairman_name=body.chairman_name,
                status=CompanyStatus.APPROVED,
            )
            db.add(company)
            await db.flush()
        current_user.role = UserRole.farmer
        current_user.name = body.name or current_user.name
        current_user.region = (body.region or "").strip() or None
        current_user.company_id = company.id
        await db.flush()
        await db.refresh(current_user)
        if current_user.company:
            await db.refresh(current_user.company)
        return UserOut(
            id=current_user.id,
            role=current_user.role,
            phone=current_user.phone,
            name=current_user.name,
            region=current_user.region,
            company_id=current_user.company_id,
            company_details=current_user.company_details,
            company_status=current_user.company.status.value if current_user.company else None,
            company_role=current_user.company_membership.company_role.value if current_user.company_membership else None,
            chat_storage_opt_in=current_user.chat_storage_opt_in,
            has_password=bool(current_user.password_hash),
        )

    if body.role == UserRole.vendor:
        if not bin_clean:
            raise HTTPException(status_code=400, detail="БИН обязателен для поставщика")
        _ensure_valid_region(body.region)
        result = await db.execute(select(Company).where(Company.bin == bin_clean))
        company = result.scalar_one_or_none()
        region_value = (body.region or "").strip() or None
        if not company:
            company = Company(
                bin=bin_clean,
                name=body.company_name,
                legal_address=body.legal_address,
                chairman_name=body.chairman_name or body.contact_name,
                bank_iik=body.bank_iik,
                bank_bik=body.bank_bik,
                region=region_value,
                status=CompanyStatus.PENDING_APPROVAL,
            )
            db.add(company)
            await db.flush()
        else:
            raise HTTPException(
                status_code=400,
                detail="Эта компания уже зарегистрирована. Обратитесь к администратору для подключения.",
            )
        current_user.role = UserRole.vendor
        current_user.name = body.name or body.contact_name or current_user.name
        current_user.company_id = company.id
        await db.flush()
        member = CompanyMember(
            user_id=current_user.id,
            company_id=company.id,
            company_role=CompanyRole.owner,
        )
        db.add(member)
        await db.flush()
        await db.refresh(current_user)
        if current_user.company:
            await db.refresh(current_user.company)
        return UserOut(
            id=current_user.id,
            role=current_user.role,
            phone=current_user.phone,
            name=current_user.name,
            region=current_user.region,
            company_id=current_user.company_id,
            company_details=current_user.company_details,
            company_status=current_user.company.status.value if current_user.company else None,
            company_role=current_user.company_membership.company_role.value if current_user.company_membership else None,
            chat_storage_opt_in=current_user.chat_storage_opt_in,
            has_password=bool(current_user.password_hash),
        )

    raise HTTPException(status_code=400, detail="Invalid role for onboarding")
