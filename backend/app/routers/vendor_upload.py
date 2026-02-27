import asyncio
import logging
import shlex
import shutil
import tempfile
from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.product import Product, ProductStatus
from app.models.user import User, UserRole
from app.models.company import Company
from app.models.audit_log import AuditLog
from app.models.company_member import CompanyMember, CompanyRole
from app.dependencies import get_current_vendor, get_current_vendor_owner, get_client_ip
from app.services.redis_client import invalidate_product_cache
from app.services.audit import write_audit_log
from app.services.storage_quota import ensure_storage_quota
from app.schemas.audit import AuditLogOut
from app.schemas.team import TeamMemberOut, TeamInviteIn, TeamRoleUpdate
from app.utils import generate_article_number
from app.services.price_parser import (
    get_column_mapping_from_llm,
    parse_excel_with_mapping,
    apply_fuzzy_name_correction,
)
from app.config import settings
import pandas as pd
import io

try:
    import magic  # type: ignore
except Exception:
    magic = None

logger = logging.getLogger(__name__)

router = APIRouter()
MAX_MB = 10

# Директория для загруженных фото товаров (относительно корня backend)
UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "products"
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_MB = getattr(settings, "max_upload_mb", 10)
EXCEL_MIME_TYPES = {
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

_MAGIC = None
if magic:
    try:
        _MAGIC = magic.Magic(mime=True)
    except Exception as exc:
        logger.warning("python-magic not available: %s", exc)


def _bytes_to_mb(length: int) -> float:
    return round(length / (1024 * 1024), 6)


def _detect_mime(content: bytes) -> str:
    if not _MAGIC:
        raise HTTPException(status_code=500, detail="MIME detector is not configured (python-magic missing).")
    return _MAGIC.from_buffer(content)


def _ensure_allowed_mime(content: bytes, allowed: set[str], label: str) -> str:
    detected = _detect_mime(content)
    if detected not in allowed:
        raise HTTPException(status_code=400, detail=f"Недопустимый тип файла для {label}: {detected}")
    return detected


def _clamav_scan_enabled() -> bool:
    """True if ClamAV scan is configured (non-empty CLAMAV_SCAN_COMMAND)."""
    return bool((settings.clamav_scan_command or "").strip())


def _clamav_command_args() -> list[str]:
    command = (settings.clamav_scan_command or "").strip()
    if not command:
        raise HTTPException(status_code=503, detail="Антивирус недоступен: не задано CLAMAV_SCAN_COMMAND.")
    parts = shlex.split(command)
    if not parts or not shutil.which(parts[0]):
        raise HTTPException(status_code=503, detail=f"Антивирус недоступен: команда {parts[0] if parts else command} не найдена.")
    return parts


async def _scan_path_with_clamav(path: Path) -> None:
    args = _clamav_command_args() + [str(path)]
    try:
        proc = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
    except FileNotFoundError as exc:
        path.unlink(missing_ok=True)
        raise HTTPException(status_code=503, detail="Антивирус недоступен: clamdscan не найден.") from exc
    stdout, stderr = await proc.communicate()
    output = ((stdout or b"") + (stderr or b"")).decode(errors="ignore").strip()
    if proc.returncode == 0:
        return
    path.unlink(missing_ok=True)
    if proc.returncode == 1:
        logger.warning("ClamAV detected malware: %s", output)
        raise HTTPException(status_code=400, detail="Файл отклонён антивирусом.")
    logger.error("ClamAV scan failed (code %s): %s", proc.returncode, output)
    raise HTTPException(status_code=503, detail="Антивирус недоступен (ошибка проверки).")


async def _scan_content_with_clamav(content: bytes, suffix: str) -> None:
    suffix = suffix if suffix.startswith(".") else f".{suffix}" if suffix else ".tmp"
    tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        tmp_file.write(content)
        tmp_file.close()
        await _scan_path_with_clamav(Path(tmp_file.name))
    finally:
        Path(tmp_file.name).unlink(missing_ok=True)


async def _reserve_storage_quota(
    db: AsyncSession,
    current_user: User,
    request: Request,
    file_size_mb: float,
) -> None:
    quota = getattr(settings, "vendor_storage_quota_mb", 0)
    company_id = current_user.company_id
    if not company_id or quota <= 0:
        return
    stmt = select(Company).where(Company.id == company_id).with_for_update()
    result = await db.execute(stmt)
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=400, detail="Компания не найдена для продавца.")
    try:
        new_usage = ensure_storage_quota(company.storage_used_mb or 0.0, quota, file_size_mb)
    except HTTPException as exc:
        await write_audit_log(
            db,
            user_id=current_user.id,
            company_id=company_id,
            action="storage_quota_exceeded",
            details={
                "limit_mb": quota,
                "attempted_file_mb": round(file_size_mb, 4),
            },
            ip=get_client_ip(request),
        )
        raise exc
    company.storage_used_mb = new_usage
    await db.flush()


@router.post("/upload-pricelist")
async def upload_pricelist(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_vendor),
):
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(400, "Only Excel files (.xlsx, .xls) allowed")
    content = await file.read()
    if len(content) > MAX_MB * 1024 * 1024:
        raise HTTPException(400, f"File too large (max {MAX_MB} MB)")
    detected_mime = _ensure_allowed_mime(content, EXCEL_MIME_TYPES, "прайс-листа")
    if _clamav_scan_enabled():
        try:
            await _scan_content_with_clamav(content, Path(file.filename or "").suffix.lower() or ".xlsx")
        except HTTPException as exc:
            if exc.status_code == 400:
                await write_audit_log(
                    db,
                    user_id=current_user.id,
                    company_id=current_user.company_id,
                    action="vendor_upload_blocked",
                    details={"reason": "malware_detected", "mime": detected_mime},
                    ip=get_client_ip(request),
                )
            raise
    df = pd.read_excel(io.BytesIO(content), header=0)
    sample = df.head(15).to_dict(orient="records")
    sample_rows = []
    for r in sample:
        row = {}
        for k, v in r.items():
            if pd.notna(v):
                row[str(k)] = str(v) if not isinstance(v, (int, float)) else v
        sample_rows.append(row)
    mapping_result = await get_column_mapping_from_llm(sample_rows)
    rows = parse_excel_with_mapping(content, mapping_result.mapping)
    company_user_ids: list[int] | None = None
    if current_user.company_id is not None:
        res = await db.execute(select(User.id).where(User.company_id == current_user.company_id))
        company_user_ids = [row[0] for row in res.all()]
    vendor_filter = company_user_ids if company_user_ids else [current_user.id]
    known_names_result = await db.execute(
        select(Product.name).where(Product.vendor_id.in_(vendor_filter)).distinct().limit(500)
    )
    known_names = [r[0] for r in known_names_result.all() if r[0]]
    rows = apply_fuzzy_name_correction(rows, mapping_result.confidence, known_part_names=known_names or None)
    created = 0
    updated = 0
    for r in rows:
        article = (r.get("article_number") or "").strip() or generate_article_number()
        name = r.get("name", "")
        price = r.get("price", 0)
        qty = r.get("quantity", 0)
        if not name:
            continue
        result = await db.execute(select(Product).where(Product.article_number == article, Product.vendor_id.in_(vendor_filter)))
        existing = result.scalar_one_or_none()
        if existing:
            existing.name = name
            existing.price = price
            existing.stock_quantity = qty
            existing.status = ProductStatus.in_stock if qty > 0 else ProductStatus.on_order
            updated += 1
        else:
            product = Product(
                vendor_id=current_user.id,
                name=name,
                article_number=article,
                price=price,
                stock_quantity=qty,
                status=ProductStatus.in_stock if qty > 0 else ProductStatus.on_order,
            )
            db.add(product)
            created += 1
    await db.flush()
    await invalidate_product_cache()
    if current_user.company_id:
        await write_audit_log(
            db,
            user_id=current_user.id,
            company_id=current_user.company_id,
            action="pricelist_upload",
            details={"created": created, "updated": updated, "rows_processed": len(rows)},
            ip=get_client_ip(request),
        )
        await db.flush()
    return {
        "created": created,
        "updated": updated,
        "rows_processed": len(rows),
        "mapping_confidence": mapping_result.confidence,
    }


@router.post("/upload-image")
async def upload_product_image(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_vendor),
):
    """Загрузка фото товара. Возвращает URL для сохранения в product.images."""
    if not file.filename:
        raise HTTPException(400, "Файл без имени")
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(400, f"Разрешены только изображения: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}")
    content = await file.read()
    if len(content) > MAX_IMAGE_MB * 1024 * 1024:
        raise HTTPException(400, f"Размер файла не более {MAX_IMAGE_MB} МБ")
    detected_mime = _ensure_allowed_mime(content, ALLOWED_IMAGE_CONTENT_TYPES, "изображения")
    await _reserve_storage_quota(db, current_user, request, _bytes_to_mb(len(content)))
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    name = f"{uuid4().hex}{ext}"
    path = UPLOADS_DIR / name
    path.write_bytes(content)
    if _clamav_scan_enabled():
        try:
            await _scan_path_with_clamav(path)
        except HTTPException as exc:
            if exc.status_code == 400:
                await write_audit_log(
                    db,
                    user_id=current_user.id,
                    company_id=current_user.company_id,
                    action="vendor_upload_blocked",
                    details={"reason": "malware_detected", "mime": detected_mime},
                    ip=get_client_ip(request),
                )
            raise
    # Путь для фронтенда: /uploads/products/xxx (без /api, прокси сам добавит)
    url = f"/uploads/products/{name}"
    return {"url": url}


@router.get("/audit-log")
async def vendor_audit_log(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    action: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_vendor),
):
    """List audit log entries for the current vendor's company. Vendor must have company_id."""
    if not current_user.company_id:
        return {"items": [], "total": 0}
    stmt = (
        select(AuditLog, User.phone, User.name)
        .outerjoin(User, AuditLog.user_id == User.id)
        .where(AuditLog.company_id == current_user.company_id)
    )
    if action:
        stmt = stmt.where(AuditLog.action == action)
    count_stmt = select(func.count()).select_from(AuditLog).where(AuditLog.company_id == current_user.company_id)
    if action:
        count_stmt = count_stmt.where(AuditLog.action == action)
    total = (await db.execute(count_stmt)).scalar() or 0
    stmt = stmt.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    rows = result.all()
    items = [
        AuditLogOut(
            id=log.id,
            user_id=log.user_id,
            user_phone=phone,
            user_name=name,
            company_id=log.company_id,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            details=log.details,
            created_at=log.created_at,
        )
        for log, phone, name in rows
    ]
    return {"items": items, "total": total}


def _normalize_phone(phone: str) -> str:
    p = (phone or "").strip().replace(" ", "").replace("-", "")
    if p and not p.startswith("+"):
        p = "+" + p
    return p


def _validate_phone(phone: str) -> None:
    """Raise HTTPException 400 if phone format is invalid after normalization."""
    if not phone or len(phone) < 10:
        raise HTTPException(400, "Некорректный номер телефона (минимум 10 символов)")
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) < 10:
        raise HTTPException(400, "Некорректный номер телефона (должны быть цифры)")


@router.get("/team", response_model=list[TeamMemberOut])
async def list_team(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_vendor),
):
    """List company members. Any vendor in the company can see the list."""
    if not current_user.company_id:
        return []
    stmt = (
        select(CompanyMember, User.phone, User.name)
        .join(User, CompanyMember.user_id == User.id)
        .where(CompanyMember.company_id == current_user.company_id)
        .order_by(CompanyMember.created_at.asc())
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [
        TeamMemberOut(
            user_id=m.user_id,
            phone=phone,
            name=name,
            company_role=m.company_role,
            invited_by_id=m.invited_by_id,
            created_at=m.created_at,
        )
        for m, phone, name in rows
    ]


@router.post("/team/invite", status_code=201)
async def invite_team_member(
    body: TeamInviteIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_vendor_owner),
):
    """Invite a user to the company. Only owner (or admin)."""
    if not current_user.company_id:
        raise HTTPException(400, "Company required")
    if body.company_role == CompanyRole.owner:
        raise HTTPException(400, "Нельзя пригласить с ролью владельца")
    phone = _normalize_phone(body.phone)
    if not phone:
        raise HTTPException(400, "Укажите телефон")
    _validate_phone(phone)
    result = await db.execute(select(User).where(User.phone == phone))
    existing = result.scalar_one_or_none()
    if existing:
        if existing.company_id == current_user.company_id:
            raise HTTPException(400, "Пользователь уже в вашей компании")
        if existing.company_id is not None:
            raise HTTPException(400, "Пользователь состоит в другой компании")
        existing.company_id = current_user.company_id
        existing.role = UserRole.vendor
        user = existing
        await db.flush()
    else:
        user = User(
            role=UserRole.vendor,
            phone=phone,
            company_id=current_user.company_id,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
    member = CompanyMember(
        user_id=user.id,
        company_id=current_user.company_id,
        company_role=body.company_role,
        invited_by_id=current_user.id if current_user.role != UserRole.admin else None,
    )
    db.add(member)
    await db.flush()
    if current_user.company_id:
        await write_audit_log(
            db,
            user_id=current_user.id,
            company_id=current_user.company_id,
            action="team_invite",
            entity_type="user",
            entity_id=user.id,
            details={"phone": phone, "company_role": body.company_role.value},
            ip=get_client_ip(request),
        )
        await db.flush()
    return {"user_id": user.id, "phone": phone, "company_role": body.company_role.value}


@router.patch("/team/{user_id}/role")
async def set_team_member_role(
    user_id: int,
    body: TeamRoleUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_vendor_owner),
):
    """Change member's company role. Only owner. Body: { company_role }."""
    if not current_user.company_id:
        raise HTTPException(400, "Company required")
    result = await db.execute(
        select(CompanyMember).where(
            CompanyMember.user_id == user_id,
            CompanyMember.company_id == current_user.company_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(404, "Сотрудник не найден в вашей компании")
    if member.company_role == CompanyRole.owner and body.company_role != CompanyRole.owner:
        owner_count = (
            await db.execute(
                select(func.count()).select_from(CompanyMember).where(
                    CompanyMember.company_id == current_user.company_id,
                    CompanyMember.company_role == CompanyRole.owner,
                )
            )
        ).scalar() or 0
        if owner_count <= 1:
            raise HTTPException(400, "Нельзя понизить последнего владельца компании")
    member.company_role = body.company_role
    await db.flush()
    if current_user.company_id:
        await write_audit_log(
            db,
            user_id=current_user.id,
            company_id=current_user.company_id,
            action="team_role_change",
            entity_type="user",
            entity_id=user_id,
            details={"company_role": body.company_role.value},
            ip=get_client_ip(request),
        )
        await db.flush()
    return {"user_id": user_id, "company_role": body.company_role.value}


@router.delete("/team/{user_id}", status_code=204)
async def remove_team_member(
    user_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_vendor_owner),
):
    """Remove user from company. Only owner. Cannot remove last owner."""
    if not current_user.company_id:
        raise HTTPException(404, "Company required")
    if user_id == current_user.id:
        raise HTTPException(400, "Нельзя удалить себя. Передайте владение другому сотруднику.")
    result = await db.execute(
        select(CompanyMember).where(
            CompanyMember.user_id == user_id,
            CompanyMember.company_id == current_user.company_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(404, "Сотрудник не найден в вашей компании")
    if member.company_role == CompanyRole.owner:
        owner_count = (
            await db.execute(
                select(func.count()).select_from(CompanyMember).where(
                    CompanyMember.company_id == current_user.company_id,
                    CompanyMember.company_role == CompanyRole.owner,
                )
            )
        ).scalar() or 0
        if owner_count <= 1:
            raise HTTPException(400, "Нельзя удалить последнего владельца компании")
    user = await db.get(User, user_id)
    if user:
        user.company_id = None
        user.role = UserRole.guest
        await db.flush()
    await db.delete(member)
    await db.flush()
    if current_user.company_id and user:
        await write_audit_log(
            db,
            user_id=current_user.id,
            company_id=current_user.company_id,
            action="team_remove",
            entity_type="user",
            entity_id=user_id,
            details={"phone": user.phone},
            ip=get_client_ip(request),
        )
        await db.flush()
