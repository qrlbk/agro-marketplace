from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from jose import jwt
from passlib.context import CryptContext
import pyotp
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.staff import Staff, Role, Permission
from app.config import settings
from app.schemas.staff import (
    StaffLoginIn, StaffMeOut, StaffChangePasswordIn, TokenOut, StaffRoleOut,
    StaffEmployeeOut, StaffEmployeeCreate, StaffEmployeeUpdate,
    PermissionOut, RoleOut, RoleCreate, RoleUpdate,
)
from app.dependencies import get_current_staff, get_current_staff_with_permission, get_current_staff_with_any_permission, STAFF_JWT_ISSUER, get_client_ip
from app.services.audit import write_staff_audit_log
from app.services.redis_client import get_redis

router = APIRouter()
pwd_ctx = CryptContext(schemes=["bcrypt"])
STAFF_RL_IP_PREFIX = "staffrl:ip:"
STAFF_RL_LOGIN_PREFIX = "staffrl:login:"


def _create_staff_token(staff_id: int, permissions: list[str]) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_access_expire_minutes)
    secret = settings.staff_jwt_secret or settings.jwt_secret
    payload = {
        "sub": str(staff_id),
        "exp": expire,
        "permissions": permissions,
        "iss": STAFF_JWT_ISSUER,
    }
    return jwt.encode(payload, secret, algorithm=settings.jwt_algorithm)


def _staff_to_me_out(staff: Staff) -> StaffMeOut:
    permissions = [p.code for p in staff.role.permissions] if staff.role else []
    return StaffMeOut(
        id=staff.id,
        login=staff.login,
        name=staff.name,
        role=StaffRoleOut(id=staff.role.id, name=staff.role.name, slug=staff.role.slug),
        permissions=permissions,
        is_active=staff.is_active,
    )


def _validate_staff_password(password: str) -> None:
    min_len = settings.staff_password_min_length
    if len(password) < min_len:
        raise HTTPException(status_code=400, detail=f"Пароль должен содержать минимум {min_len} символов.")
    if not any(c.isalpha() for c in password):
        raise HTTPException(status_code=400, detail="Пароль должен содержать буквы.")
    if not any(c.isdigit() for c in password):
        raise HTTPException(status_code=400, detail="Пароль должен содержать цифры.")


async def _is_staff_login_blocked(login: str, client_ip: str) -> bool:
    r = await get_redis()
    login_key = f"{STAFF_RL_LOGIN_PREFIX}{login}"
    ip_key = f"{STAFF_RL_IP_PREFIX}{client_ip}"
    login_count = await r.get(login_key)
    ip_count = await r.get(ip_key)
    if login_count and int(login_count) >= settings.staff_login_rate_limit_per_login:
        return True
    if ip_count and int(ip_count) >= settings.staff_login_rate_limit_per_ip:
        return True
    return False


async def _register_staff_login_failure(login: str, client_ip: str) -> None:
    r = await get_redis()
    window = settings.staff_login_rate_limit_window_seconds

    login_key = f"{STAFF_RL_LOGIN_PREFIX}{login}"
    attempts_login = await r.incr(login_key)
    if attempts_login == 1:
        await r.expire(login_key, window)
    if attempts_login >= settings.staff_login_rate_limit_per_login:
        raise HTTPException(status_code=429, detail="Слишком много попыток входа. Попробуйте позже.")

    ip_key = f"{STAFF_RL_IP_PREFIX}{client_ip}"
    attempts_ip = await r.incr(ip_key)
    if attempts_ip == 1:
        await r.expire(ip_key, window)
    if attempts_ip >= settings.staff_login_rate_limit_per_ip:
        raise HTTPException(status_code=429, detail="Слишком много попыток входа. Попробуйте позже.")


async def _reset_staff_login_counters(login: str, client_ip: str) -> None:
    r = await get_redis()
    await r.delete(f"{STAFF_RL_LOGIN_PREFIX}{login}")
    await r.delete(f"{STAFF_RL_IP_PREFIX}{client_ip}")


def _verify_totp(code: str) -> bool:
    secret = (settings.staff_totp_secret or "").strip()
    if not secret:
        return False
    try:
        totp = pyotp.TOTP(secret)
        return bool(totp.verify(code, valid_window=1))
    except Exception:
        return False

@router.post("/login", response_model=TokenOut)
async def staff_login(
    body: StaffLoginIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    login = (body.login or "").strip()
    password = (body.password or "").strip()
    if not login:
        raise HTTPException(status_code=400, detail="Login required")
    if not password:
        raise HTTPException(status_code=400, detail="Password required")
    client_ip = get_client_ip(request) or "0.0.0.0"
    if await _is_staff_login_blocked(login, client_ip):
        raise HTTPException(status_code=429, detail="Слишком много попыток входа. Попробуйте позже.")
    result = await db.execute(
        select(Staff).where(Staff.login == login).options(
            selectinload(Staff.role).selectinload(Role.permissions)
        )
    )
    staff = result.scalar_one_or_none()
    if not staff:
        await _register_staff_login_failure(login, client_ip)
        raise HTTPException(status_code=401, detail="Invalid login or password")
    if not staff.is_active:
        await write_staff_audit_log(
            db,
            staff.id,
            "staff_login_blocked",
            details={"reason": "disabled"},
            ip=client_ip,
        )
        raise HTTPException(status_code=403, detail="Account disabled")
    if not pwd_ctx.verify(password, staff.password_hash):
        try:
            await _register_staff_login_failure(login, client_ip)
        except HTTPException as exc:
            await write_staff_audit_log(
                db,
                staff.id,
                "staff_login_blocked",
                details={"reason": "rate_limit"},
                ip=client_ip,
            )
            raise exc
        await write_staff_audit_log(
            db,
            staff.id,
            "staff_login_failed",
            details={"reason": "bad_password"},
            ip=client_ip,
        )
        raise HTTPException(status_code=401, detail="Invalid login or password")

    if settings.staff_totp_required:
        otp_code = (body.otp_code or "").strip()
        if not otp_code:
            await _register_staff_login_failure(login, client_ip)
            raise HTTPException(status_code=400, detail="Требуется одноразовый код.")
        if not _verify_totp(otp_code):
            try:
                await _register_staff_login_failure(login, client_ip)
            except HTTPException as exc:
                await write_staff_audit_log(
                    db,
                    staff.id,
                    "staff_login_blocked",
                    details={"reason": "rate_limit"},
                    ip=client_ip,
                )
                raise exc
            await write_staff_audit_log(
                db,
                staff.id,
                "staff_login_failed",
                details={"reason": "totp_invalid"},
                ip=client_ip,
            )
            raise HTTPException(status_code=401, detail="Неверный одноразовый код.")

    await _reset_staff_login_counters(login, client_ip)
    permissions = [p.code for p in staff.role.permissions] if staff.role else []
    if staff.role and staff.role.slug == "super_admin":
        permissions = [
            "dashboard.view", "orders.view", "orders.edit", "vendors.view", "vendors.approve",
            "feedback.view", "feedback.edit", "users.view", "users.edit", "audit.view", "search.view",
            "staff.manage", "roles.manage",
        ]
    token = _create_staff_token(staff.id, permissions)
    await write_staff_audit_log(
        db,
        staff.id,
        "staff_login_success",
        details={"login": login},
        ip=client_ip,
    )
    return TokenOut(access_token=token)


@router.get("/me", response_model=StaffMeOut)
async def staff_me(staff: Staff = Depends(get_current_staff)):
    return _staff_to_me_out(staff)


@router.post("/me/change-password")
async def staff_change_password(
    body: StaffChangePasswordIn,
    db: AsyncSession = Depends(get_db),
    staff: Staff = Depends(get_current_staff),
):
    if not pwd_ctx.verify(body.current_password, staff.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    new_password = (body.new_password or "").strip()
    _validate_staff_password(new_password)
    staff.password_hash = pwd_ctx.hash(new_password)
    await db.flush()
    await db.refresh(staff)
    return {"message": "Password updated"}


# --- Employees (staff.manage) ---

@router.get("/employees", response_model=list[StaffEmployeeOut])
async def list_employees(
    db: AsyncSession = Depends(get_db),
    staff: Staff = Depends(get_current_staff_with_permission("staff.manage")),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    result = await db.execute(
        select(Staff).options(selectinload(Staff.role))
        .order_by(Staff.id).limit(limit).offset(offset)
    )
    employees = result.scalars().all()
    return [
        StaffEmployeeOut(
            id=s.id,
            login=s.login,
            name=s.name,
            role_id=s.role_id,
            role_name=s.role.name,
            role_slug=s.role.slug,
            is_active=s.is_active,
            created_at=s.created_at.isoformat() if s.created_at else "",
        )
        for s in employees
    ]


@router.post("/employees", response_model=StaffEmployeeOut)
async def create_employee(
    body: StaffEmployeeCreate,
    db: AsyncSession = Depends(get_db),
    staff: Staff = Depends(get_current_staff_with_permission("staff.manage")),
):
    existing = await db.execute(select(Staff).where(Staff.login == body.login.strip()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Login already exists")
    result = await db.execute(select(Role).where(Role.id == body.role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=400, detail="Role not found")
    password = (body.password or "").strip()
    _validate_staff_password(password)
    new_staff = Staff(
        login=body.login.strip(),
        password_hash=pwd_ctx.hash(password),
        role_id=body.role_id,
        name=(body.name.strip() or None) if (body.name and body.name.strip()) else None,
        is_active=body.is_active,
    )
    db.add(new_staff)
    await db.flush()
    await db.refresh(new_staff)
    await db.refresh(new_staff.role)
    return StaffEmployeeOut(
        id=new_staff.id,
        login=new_staff.login,
        name=new_staff.name,
        role_id=new_staff.role_id,
        role_name=new_staff.role.name,
        role_slug=new_staff.role.slug,
        is_active=new_staff.is_active,
        created_at=new_staff.created_at.isoformat() if new_staff.created_at else "",
    )


@router.patch("/employees/{employee_id}", response_model=StaffEmployeeOut)
async def update_employee(
    employee_id: int,
    body: StaffEmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    staff: Staff = Depends(get_current_staff_with_permission("staff.manage")),
):
    result = await db.execute(select(Staff).where(Staff.id == employee_id).options(selectinload(Staff.role)))
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    if body.name is not None:
        emp.name = body.name.strip() or None if body.name else None
    if body.role_id is not None:
        r = await db.execute(select(Role).where(Role.id == body.role_id))
        if not r.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Role not found")
        emp.role_id = body.role_id
    if body.is_active is not None:
        emp.is_active = body.is_active
    if body.new_password is not None and body.new_password.strip():
        new_password = body.new_password.strip()
        _validate_staff_password(new_password)
        emp.password_hash = pwd_ctx.hash(new_password)
    await db.flush()
    await db.refresh(emp)
    await db.refresh(emp.role)
    return StaffEmployeeOut(
        id=emp.id,
        login=emp.login,
        name=emp.name,
        role_id=emp.role_id,
        role_name=emp.role.name,
        role_slug=emp.role.slug,
        is_active=emp.is_active,
        created_at=emp.created_at.isoformat() if emp.created_at else "",
    )


# --- Permissions (roles.manage) ---

@router.get("/permissions", response_model=list[PermissionOut])
async def list_permissions(
    db: AsyncSession = Depends(get_db),
    staff: Staff = Depends(get_current_staff_with_permission("roles.manage")),
):
    result = await db.execute(select(Permission).order_by(Permission.code))
    perms = result.scalars().all()
    return [PermissionOut(id=p.id, code=p.code, name=p.name) for p in perms]


# --- Roles (roles.manage) ---

@router.get("/roles", response_model=list[RoleOut])
async def list_roles(
    db: AsyncSession = Depends(get_db),
    staff: Staff = Depends(get_current_staff_with_any_permission("roles.manage", "staff.manage")),
):
    result = await db.execute(
        select(Role).options(selectinload(Role.permissions)).order_by(Role.id)
    )
    roles = result.scalars().all()
    return [
        RoleOut(
            id=r.id,
            name=r.name,
            slug=r.slug,
            is_system=r.is_system,
            permission_codes=[p.code for p in r.permissions],
        )
        for r in roles
    ]


@router.post("/roles", response_model=RoleOut)
async def create_role(
    body: RoleCreate,
    db: AsyncSession = Depends(get_db),
    staff: Staff = Depends(get_current_staff_with_permission("roles.manage")),
):
    existing = await db.execute(select(Role).where(Role.slug == body.slug.strip()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slug already exists")
    new_role = Role(name=body.name.strip(), slug=body.slug.strip(), is_system=False)
    db.add(new_role)
    await db.flush()
    if body.permission_ids:
        perms = await db.execute(select(Permission).where(Permission.id.in_(body.permission_ids)))
        new_role.permissions = list(perms.scalars().all())
        await db.flush()
    await db.refresh(new_role)
    await db.refresh(new_role, ["permissions"])
    result = await db.execute(select(Role).where(Role.id == new_role.id).options(selectinload(Role.permissions)))
    r = result.scalar_one()
    return RoleOut(id=r.id, name=r.name, slug=r.slug, is_system=r.is_system, permission_codes=[p.code for p in r.permissions])


@router.patch("/roles/{role_id}", response_model=RoleOut)
async def update_role(
    request: Request,
    role_id: int,
    body: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    staff: Staff = Depends(get_current_staff_with_permission("roles.manage")),
):
    result = await db.execute(select(Role).where(Role.id == role_id).options(selectinload(Role.permissions)))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.is_system and body.slug is not None and body.slug.strip() != role.slug:
        raise HTTPException(status_code=400, detail="Cannot change slug of system role")
    if body.name is not None:
        role.name = body.name.strip()
    if body.slug is not None and (not role.is_system or body.slug.strip() == role.slug):
        slug = body.slug.strip()
        if slug != role.slug:
            ex = await db.execute(select(Role).where(Role.slug == slug))
            if ex.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Slug already exists")
        role.slug = slug
    if body.permission_ids is not None:
        perms = await db.execute(select(Permission).where(Permission.id.in_(body.permission_ids)))
        role.permissions = list(perms.scalars().all())
    await db.flush()
    await write_staff_audit_log(
        db, staff.id, "role_update",
        entity_type="role", entity_id=role_id,
        details={"name": role.name, "slug": role.slug},
        ip=get_client_ip(request),
    )
    await db.refresh(role)
    await db.refresh(role, ["permissions"])
    return RoleOut(id=role.id, name=role.name, slug=role.slug, is_system=role.is_system, permission_codes=[p.code for p in role.permissions])
