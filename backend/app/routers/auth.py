import random
import string
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User, UserRole
from app.config import settings
from app.schemas.auth import RequestOTPIn, VerifyOTPIn, DemoLoginIn, TokenOut
from app.schemas.user import UserOut
from app.services.redis_client import get_redis
from app.services.sms import sms_gateway
from app.dependencies import get_current_user

router = APIRouter()

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
        user = User(role=UserRole.farmer, phone=body.phone)
        db.add(user)
        await db.flush()
        await db.refresh(user)
    token = create_access_token(user.id, user.role, user.phone)
    return TokenOut(access_token=token)


# Демо-вход по паролю (только для тестовых аккаунтов из seed)
DEMO_CREDENTIALS = {
    "+77001112233": "admin",
    "+77009998877": "user",
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
    if phone not in DEMO_CREDENTIALS or DEMO_CREDENTIALS[phone] != password:
        raise HTTPException(status_code=400, detail="Неверный телефон или пароль. Admin: +77001112233 / admin. Farmer: +77009998877 / user")
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=400, detail="User not found. Run seed script.")
    token = create_access_token(user.id, user.role, user.phone)
    return TokenOut(access_token=token)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
