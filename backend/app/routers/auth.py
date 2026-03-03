import hmac
import logging
from passlib.context import CryptContext
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request
from pydantic import BaseModel
import jwt
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
    RefreshTokenIn,
)
from app.schemas.user import UserOut, ProfileUpdateIn
from app.schemas.onboarding import OnboardingIn
from app.services.redis_client import get_redis
from app.services.sms import sms_gateway
from app.services.bin_lookup import lookup_bin
from app.dependencies import get_current_user, get_client_ip, security
from app.services.audit import write_audit_log
from app.constants.regions import validate_region
from app.utils.sanitize import sanitize_text
from app.services.auth import (
    check_otp_rate_limit,
    check_otp_verify_rate_limit,
    create_access_token,
    create_refresh_token,
    delete_hashed_otp,
    ensure_otp_not_blocked,
    generate_otp_code,
    hash_otp_code,
    load_hashed_otp,
    make_token_out,
    otp_lock_message,
    raise_invalid_otp_code,
    register_otp_failure,
    reset_otp_failure_counters,
    save_hashed_otp,
    refresh_secret,
    MARKETPLACE_JWT_ISSUER,
    REFRESH_TOKEN_TYPE,
    check_demo_login_rate_limit,
    demo_role_to_user_role,
    is_login_blocked,
    register_login_failure,
    reset_login_counters,
)

router = APIRouter()
logger = logging.getLogger(__name__)

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


def _normalize_phone(phone: str) -> str:
    p = (phone or "").strip().replace(" ", "").replace("-", "")
    if p and not p.startswith("+"):
        p = "+" + p
    return p


def _is_production() -> bool:
    return (settings.environment or "").strip().lower() in ("prod", "production")


@router.post("/request-otp")
async def request_otp(
    body: RequestOTPIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    client_ip = get_client_ip(request) or "0.0.0.0"
    await check_otp_rate_limit(body.phone, client_ip)

    code = generate_otp_code()
    await save_hashed_otp(body.phone, hash_otp_code(code))
    await sms_gateway.send(body.phone, f"Код для входа: {code}")
    return {"message": "OTP sent"}


@router.post("/verify-otp", response_model=TokenOut)
async def verify_otp(
    body: VerifyOTPIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    client_ip = get_client_ip(request) or "0.0.0.0"
    await check_otp_verify_rate_limit(body.phone, client_ip)
    await ensure_otp_not_blocked(body.phone, client_ip)
    stored = await load_hashed_otp(body.phone)
    if not stored:
        await raise_invalid_otp_code(body.phone, client_ip, db)
    else:
        candidate = hash_otp_code(body.code)
        if not hmac.compare_digest(stored, candidate):
            await raise_invalid_otp_code(body.phone, client_ip, db)
        await delete_hashed_otp(body.phone)
        await reset_otp_failure_counters(body.phone, client_ip)
    result = await db.execute(select(User).where(User.phone == body.phone))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(role=UserRole.guest, phone=body.phone)
        db.add(user)
        await db.flush()
        await db.refresh(user)
    return make_token_out(user.id, user.role, user.phone, client_ip)


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
    demo_phone = (settings.demo_phone or "").strip()
    demo_password = (settings.demo_password or "").strip()
    if not demo_phone or not demo_password:
        raise HTTPException(status_code=503, detail="Демо-вход не настроен (DEMO_PHONE/DEMO_PASSWORD).")
    client_ip = get_client_ip(request) or "0.0.0.0"
    await check_demo_login_rate_limit(client_ip)
    phone = _normalize_phone(body.phone)
    password = (body.password or "").strip()
    if phone != demo_phone or password != demo_password:
        raise HTTPException(status_code=400, detail="Неверный телефон или пароль.")
    role = demo_role_to_user_role()
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(role=role, phone=phone, name="Demo")
        db.add(user)
        await db.flush()
        await db.refresh(user)
    return make_token_out(user.id, role, user.phone, client_ip)


@router.post("/login-password", response_model=TokenOut)
async def login_with_password(
    body: PasswordLoginIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    client_ip = get_client_ip(request) or "0.0.0.0"
    if await is_login_blocked(body.phone, client_ip):
        raise HTTPException(status_code=429, detail=otp_lock_message())
    password = (body.password or "").strip()
    if not password:
        raise HTTPException(status_code=400, detail="Пароль обязателен.")
    result = await db.execute(select(User).where(User.phone == body.phone))
    user = result.scalar_one_or_none()
    if user is None or not user.password_hash:
        await write_audit_log(
            db, None, None, "login_failed",
            details={"phone": body.phone, "ip": client_ip}, ip=client_ip,
        )
        await register_login_failure(body.phone, client_ip)
        raise HTTPException(status_code=400, detail="Неверный телефон или пароль.")
    if not pwd_ctx.verify(password, user.password_hash):
        await write_audit_log(
            db, None, None, "login_failed",
            details={"phone": body.phone, "ip": client_ip}, ip=client_ip,
        )
        await register_login_failure(body.phone, client_ip)
        raise HTTPException(status_code=400, detail="Неверный телефон или пароль.")
    await reset_login_counters(body.phone, client_ip)
    return make_token_out(user.id, user.role, user.phone, client_ip)


@router.post("/refresh", response_model=TokenOut)
async def refresh_tokens(
    body: RefreshTokenIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Exchange a valid refresh token for a new access and refresh token pair (rotation)."""
    from app.services.token_blacklist import is_blacklisted, blacklist_token
    from datetime import datetime, timezone
    try:
        payload = jwt.decode(
            body.refresh_token,
            refresh_secret(),
            algorithms=[settings.jwt_algorithm],
            issuer=MARKETPLACE_JWT_ISSUER,
        )
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    if payload.get("type") != REFRESH_TOKEN_TYPE:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    jti = payload.get("jti")
    if await is_blacklisted(jti):
        raise HTTPException(status_code=401, detail="Token revoked")
    user_id = payload.get("sub")
    role_val = payload.get("role")
    phone = payload.get("phone")
    if not user_id or not role_val or not phone:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    try:
        role = UserRole(role_val)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user or user.phone != phone:
        raise HTTPException(status_code=401, detail="User not found")
    exp = payload.get("exp")
    if exp:
        remaining = int(exp - datetime.now(timezone.utc).timestamp())
        if remaining > 0:
            await blacklist_token(jti, remaining)
    client_ip = get_client_ip(request)
    return make_token_out(user.id, user.role, user.phone, client_ip)


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


class LogoutIn(BaseModel):
    refresh_token: str | None = None


@router.post("/logout")
async def logout(
    request: Request,
    credentials=Depends(security),
    body: LogoutIn | None = Body(None),
):
    """Invalidate the current access JWT and optionally the refresh token by blacklisting their jti."""
    from app.services.token_blacklist import blacklist_token
    from datetime import datetime, timezone
    if credentials:
        token = credentials.credentials
        try:
            payload = jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=[settings.jwt_algorithm],
                options={"verify_iss": False},
            )
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti and exp:
                remaining = int(exp - datetime.now(timezone.utc).timestamp())
                if remaining > 0:
                    await blacklist_token(jti, remaining)
        except Exception:
            pass
    if body and body.refresh_token:
        try:
            payload = jwt.decode(
                body.refresh_token,
                refresh_secret(),
                algorithms=[settings.jwt_algorithm],
                options={"verify_iss": False},
            )
            if payload.get("type") == REFRESH_TOKEN_TYPE:
                jti = payload.get("jti")
                exp = payload.get("exp")
                if jti and exp:
                    remaining = int(exp - datetime.now(timezone.utc).timestamp())
                    if remaining > 0:
                        await blacklist_token(jti, remaining)
        except Exception:
            pass
    return {"message": "OK"}
