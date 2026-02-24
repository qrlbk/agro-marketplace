from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.company import CompanyStatus
from app.models.company_member import CompanyRole
from app.models.staff import Staff, Role
from app.config import settings

security = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if not credentials:
        return None
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id: int | None = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None
    result = await db.execute(
        select(User).where(User.id == int(user_id)).options(
            selectinload(User.company), selectinload(User.company_membership)
        )
    )
    user = result.scalar_one_or_none()
    return user


async def get_current_user(user: User | None = Depends(get_current_user_optional)) -> User:
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


def require_role(*roles: UserRole):
    async def dep(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user
    return dep


async def get_current_farmer(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.farmer, UserRole.admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Farmer or admin only")
    return current_user


async def get_current_vendor(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.vendor, UserRole.admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vendor or admin only")
    if current_user.role == UserRole.vendor and current_user.company_id:
        if current_user.company and current_user.company.status != CompanyStatus.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Заявка на поставщика на рассмотрении. Ожидайте одобрения администратора.",
            )
    return current_user


async def get_current_vendor_owner(current_user: User = Depends(get_current_vendor)) -> User:
    """Vendor must be owner in their company; admin bypasses."""
    if current_user.role == UserRole.admin:
        return current_user
    if not current_user.company_membership or current_user.company_membership.company_role != CompanyRole.owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только владелец компании может управлять сотрудниками.",
        )
    return current_user


async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return current_user


STAFF_JWT_ISSUER = "staff-portal"


async def get_current_staff(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Staff:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = credentials.credentials
    secret = settings.staff_jwt_secret or settings.jwt_secret
    try:
        kwargs = {"algorithms": [settings.jwt_algorithm]}
        if settings.staff_jwt_secret is None:
            kwargs["issuer"] = STAFF_JWT_ISSUER
        payload = jwt.decode(token, secret, **kwargs)
        staff_id = payload.get("sub")
        if staff_id is None:
            raise JWTError("No sub")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    result = await db.execute(
        select(Staff).where(Staff.id == int(staff_id)).options(
            selectinload(Staff.role).selectinload(Role.permissions)
        )
    )
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Staff not found")
    if not staff.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    return staff


def get_current_staff_with_permission(permission_code: str):
    async def dep(staff: Staff = Depends(get_current_staff)) -> Staff:
        if staff.role.slug == "super_admin":
            return staff
        codes = [p.code for p in staff.role.permissions]
        if permission_code not in codes:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return staff
    return dep


def get_current_staff_with_any_permission(*permission_codes: str):
    async def dep(staff: Staff = Depends(get_current_staff)) -> Staff:
        if staff.role.slug == "super_admin":
            return staff
        codes = [p.code for p in staff.role.permissions]
        if not any(c in codes for c in permission_codes):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return staff
    return dep


async def get_current_admin_or_staff(
    permission_code: str,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User | Staff:
    """Accept either marketplace User (admin) or Staff with given permission (staff-portal JWT)."""
    user = await get_current_user_optional(credentials, db)
    if user and user.role == UserRole.admin:
        return user
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = credentials.credentials
    secret = settings.staff_jwt_secret or settings.jwt_secret
    try:
        kwargs = {"algorithms": [settings.jwt_algorithm]}
        if settings.staff_jwt_secret is None:
            kwargs["issuer"] = STAFF_JWT_ISSUER
        payload = jwt.decode(token, secret, **kwargs)
        staff_id = payload.get("sub")
        if staff_id is None:
            raise JWTError("No sub")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    result = await db.execute(
        select(Staff).where(Staff.id == int(staff_id)).options(
            selectinload(Staff.role).selectinload(Role.permissions)
        )
    )
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Staff not found")
    if not staff.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    if staff.role.slug == "super_admin":
        return staff
    codes = [p.code for p in staff.role.permissions]
    if permission_code not in codes:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return staff


def require_admin_or_staff(permission_code: str):
    async def dep(
        credentials: HTTPAuthorizationCredentials | None = Depends(security),
        db: AsyncSession = Depends(get_db),
    ):
        return await get_current_admin_or_staff(permission_code, credentials, db)
    return dep


async def get_product_for_vendor(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_vendor),
) -> Product:
    """Load product by id; allow access if admin, or product owner, or same company (vendor)."""
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    if current_user.role == UserRole.admin:
        return product
    if product.vendor_id == current_user.id:
        return product
    # Same company: product's vendor must belong to current user's company
    vendor = await db.get(User, product.vendor_id)
    if (
        current_user.company_id is not None
        and vendor is not None
        and vendor.company_id == current_user.company_id
    ):
        return product
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your product")


def get_client_ip(request: Request | None = None) -> str | None:
    """Client IP for audit log. Uses X-Forwarded-For first element when behind proxy."""
    if request is None:
        return None
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


async def verify_webhook_1c_key(api_key: str | None = Depends(api_key_header)) -> None:
    if not settings.webhook_1c_api_key or api_key != settings.webhook_1c_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook key")
