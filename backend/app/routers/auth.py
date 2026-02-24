import random
import string
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User, UserRole
from app.models.company import Company, CompanyStatus
from app.models.company_member import CompanyMember, CompanyRole
from app.config import settings
from app.schemas.auth import RequestOTPIn, VerifyOTPIn, DemoLoginIn, TokenOut
from app.schemas.user import UserOut, ProfileUpdateIn
from app.schemas.onboarding import OnboardingIn
from app.services.redis_client import get_redis
from app.services.sms import sms_gateway
from app.services.bin_lookup import lookup_bin
from app.dependencies import get_current_user
from app.constants.regions import validate_region

router = APIRouter()


def _ensure_valid_region(region: str | None) -> None:
    """Raise 400 if region is set but not in the allowed list."""
    if region is not None and str(region).strip() and not validate_region(region):
        raise HTTPException(
            status_code=400,
            detail="Недопустимый регион. Выберите регион из списка.",
        )

OTP_KEY_PREFIX = "otp:"
OTP_LENGTH = 6
OTP_TTL = 60 * settings.otp_expire_minutes


def create_access_token(user_id: int, role: UserRole, phone: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_access_expire_minutes)
    payload = {"sub": str(user_id), "role": role.value, "phone": phone, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


@router.post("/request-otp")
async def request_otp(body: RequestOTPIn, db: AsyncSession = Depends(get_db)):
    code = "".join(random.choices(string.digits, k=OTP_LENGTH))
    r = await get_redis()
    key = f"{OTP_KEY_PREFIX}{body.phone}"
    await r.set(key, code, ex=OTP_TTL)
    await sms_gateway.send(body.phone, f"Код для входа: {code}")
    return {"message": "OTP sent"}


@router.post("/verify-otp", response_model=TokenOut)
async def verify_otp(body: VerifyOTPIn, db: AsyncSession = Depends(get_db)):
    r = await get_redis()
    key = f"{OTP_KEY_PREFIX}{body.phone}"
    stored = await r.get(key)
    if not stored or stored != body.code:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    await r.delete(key)
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


@router.post("/demo-login", response_model=TokenOut)
async def demo_login(body: DemoLoginIn, db: AsyncSession = Depends(get_db)):
    phone = _normalize_phone(body.phone)
    password = (body.password or "").strip()
    if phone not in DEMO_CREDENTIALS or DEMO_CREDENTIALS[phone][0] != password:
        raise HTTPException(status_code=400, detail="Неверный телефон или пароль. Admin: +77001112233 / admin. Farmer: +77009998877 / user")
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
    )


@router.patch("/me", response_model=UserOut)
async def update_me(
    body: ProfileUpdateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update current user profile (name, region). Region must be from the allowed list."""
    if body.name is not None:
        current_user.name = (body.name or "").strip() or None
    if body.region is not None:
        _ensure_valid_region(body.region)
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
        company_status=current_user.company.status.value if current_user.company else None,
        company_role=current_user.company_membership.company_role.value if current_user.company_membership else None,
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
            company.bank_iik = body.bank_iik or company.bank_iik
            company.bank_bik = body.bank_bik or company.bank_bik
            company.region = region_value
            if body.company_name is not None:
                company.name = body.company_name
            if body.legal_address is not None:
                company.legal_address = body.legal_address
            if body.chairman_name is not None or body.contact_name is not None:
                company.chairman_name = body.chairman_name or body.contact_name
            await db.flush()
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
        )

    raise HTTPException(status_code=400, detail="Invalid role for onboarding")
