"""JWT access/refresh token creation for marketplace auth."""

import hashlib
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from app.config import settings
from app.models.user import UserRole
from app.schemas.auth import TokenOut

MARKETPLACE_JWT_ISSUER = "marketplace"
REFRESH_TOKEN_TYPE = "refresh"


def refresh_secret() -> str:
    """Return the secret used to sign/verify refresh tokens."""
    s = getattr(settings, "jwt_refresh_secret", "") or ""
    return (s.strip() or settings.jwt_secret)


def _ip_hash(ip: str) -> str:
    return hashlib.sha256(ip.encode()).hexdigest()[:32]


def create_access_token(user_id: int, role: UserRole, phone: str, client_ip: str | None = None) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.jwt_access_expire_minutes)
    payload = {
        "sub": str(user_id),
        "role": role.value,
        "phone": phone,
        "iat": now,
        "exp": expire,
        "iss": MARKETPLACE_JWT_ISSUER,
        "jti": uuid.uuid4().hex,
    }
    if getattr(settings, "jwt_bind_ip", False) and client_ip:
        payload["ip_hash"] = _ip_hash(client_ip)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: int, role: UserRole, phone: str) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=getattr(settings, "jwt_refresh_expire_days", 7))
    payload = {
        "sub": str(user_id),
        "role": role.value,
        "phone": phone,
        "iat": now,
        "exp": expire,
        "iss": MARKETPLACE_JWT_ISSUER,
        "jti": uuid.uuid4().hex,
        "type": REFRESH_TOKEN_TYPE,
    }
    return jwt.encode(payload, refresh_secret(), algorithm=settings.jwt_algorithm)


def make_token_out(user_id: int, role: UserRole, phone: str, client_ip: str | None = None) -> TokenOut:
    access = create_access_token(user_id, role, phone, client_ip)
    refresh = create_refresh_token(user_id, role, phone)
    expires_in = settings.jwt_access_expire_minutes * 60
    return TokenOut(access_token=access, refresh_token=refresh, expires_in=expires_in)
