from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.product import Product, ProductStatus
from app.models.user import User, UserRole
from app.models.audit_log import AuditLog
from app.models.company_member import CompanyMember, CompanyRole
from app.dependencies import get_current_vendor, get_current_vendor_owner, get_client_ip
from app.services.redis_client import invalidate_product_cache
from app.services.audit import write_audit_log
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

router = APIRouter()
MAX_MB = 10

# Директория для загруженных фото товаров (относительно корня backend)
UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "products"
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_MB = getattr(settings, "max_upload_mb", 10)


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
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_vendor),
):
    """Загрузка фото товара. Возвращает URL для сохранения в product.images."""
    if not file.filename:
        raise HTTPException(400, "Файл без имени")
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(400, f"Разрешены только изображения: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}")
    content_type = file.content_type or ""
    if content_type and content_type not in ALLOWED_IMAGE_CONTENT_TYPES and not content_type.startswith("image/"):
        raise HTTPException(400, "Файл должен быть изображением")
    content = await file.read()
    if len(content) > MAX_IMAGE_MB * 1024 * 1024:
        raise HTTPException(400, f"Размер файла не более {MAX_IMAGE_MB} МБ")
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    name = f"{uuid4().hex}{ext}"
    path = UPLOADS_DIR / name
    path.write_bytes(content)
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
