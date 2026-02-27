import json
import logging
from decimal import Decimal
from datetime import datetime, timezone, timedelta, date
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, exists, text
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import ProgrammingError, OperationalError
from app.database import get_db
from app.models.user import User, UserRole
from app.models.company import Company, CompanyStatus
from app.models.order import Order, OrderStatus, OrderItem
from app.models.feedback import FeedbackTicket, FeedbackMessage, FeedbackStatus
from app.models.reply_template import ReplyTemplate
from app.models.notification import Notification
from app.models.product import Product
from app.models.audit_log import AuditLog
from app.models.product_review import ProductReview
from app.schemas.user import UserOut
from app.schemas.order import OrderItemOut, AdminOrderOut
from app.schemas.feedback import FeedbackTicketAdminOut, FeedbackTicketUpdate, FeedbackMessageOut, ReplyTemplateOut, ReplyTemplateCreate
from app.schemas.audit import AuditLogOut
from app.dependencies import require_admin_or_staff, get_client_ip
from app.models.staff import Staff
from app.services.audit import write_audit_log, write_staff_audit_log
from app.services.redis_client import get_redis
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)


class UserUpdateRole(BaseModel):
    role: UserRole


class PendingVendorOut(BaseModel):
    company_id: int
    bin: str
    company_name: str | None
    legal_address: str | None
    chairman_name: str | None
    bank_iik: str | None
    bank_bik: str | None
    user_id: int
    user_phone: str
    user_name: str | None


@router.get("/users")
async def list_users(
    role: UserRole | None = Query(None),
    phone: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_or_staff("users.view")),
):
    base = (
        select(User)
        .options(selectinload(User.company), selectinload(User.company_membership))
        .order_by(User.id)
    )
    count_stmt = select(func.count()).select_from(User)
    if role:
        base = base.where(User.role == role)
        count_stmt = count_stmt.where(User.role == role)
    if phone and phone.strip():
        base = base.where(User.phone.ilike(f"%{phone.strip()}%"))
        count_stmt = count_stmt.where(User.phone.ilike(f"%{phone.strip()}%"))
    total = (await db.execute(count_stmt)).scalar() or 0
    stmt = base.offset(offset).limit(limit)
    result = await db.execute(stmt)
    users = result.scalars().all()
    items = [
        UserOut(
            id=u.id,
            role=u.role,
            phone=u.phone,
            name=u.name,
            region=u.region,
            company_id=u.company_id,
            company_details=u.company_details,
            company_status=u.company.status.value if u.company else None,
            company_role=u.company_membership.company_role.value if u.company_membership else None,
            chat_storage_opt_in=u.chat_storage_opt_in,
            has_password=bool(u.password_hash),
        )
        for u in users
    ]
    return {"items": items, "total": total}


@router.get("/users/{user_id}", response_model=UserOut)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_or_staff("users.view")),
):
    result = await db.execute(
        select(User)
            .where(User.id == user_id)
            .options(selectinload(User.company), selectinload(User.company_membership))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    return UserOut(
        id=user.id,
        role=user.role,
        phone=user.phone,
        name=user.name,
        region=user.region,
        company_id=user.company_id,
        company_details=user.company_details,
        company_status=user.company.status.value if user.company else None,
        company_role=user.company_membership.company_role.value if user.company_membership else None,
        chat_storage_opt_in=user.chat_storage_opt_in,
        has_password=bool(user.password_hash),
    )


@router.patch("/users/{user_id}/role", response_model=UserOut)
async def set_user_role(
    user_id: int,
    body: UserUpdateRole,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_or_staff("users.edit")),
):
    result = await db.execute(
        select(User)
            .where(User.id == user_id)
            .options(selectinload(User.company), selectinload(User.company_membership))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    user.role = body.role
    await db.flush()
    await db.refresh(user)
    if user.company:
        await db.refresh(user.company)
    return UserOut(
        id=user.id,
        role=user.role,
        phone=user.phone,
        name=user.name,
        region=user.region,
        company_id=user.company_id,
        company_details=user.company_details,
        company_status=user.company.status.value if user.company else None,
        company_role=user.company_membership.company_role.value if user.company_membership else None,
        chat_storage_opt_in=user.chat_storage_opt_in,
        has_password=bool(user.password_hash),
    )


@router.get("/analytics")
async def analytics(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_or_staff("dashboard.view")),
):
    total_orders = (await db.execute(select(func.count()).select_from(Order))).scalar() or 0
    total_revenue = (await db.execute(select(func.coalesce(func.sum(Order.total_amount), 0)).select_from(Order))).scalar() or 0
    by_status = (
        await db.execute(
            select(Order.status, func.count(Order.id)).group_by(Order.status)
        )
    ).all()
    return {
        "total_orders": total_orders,
        "total_revenue": float(total_revenue),
        "by_status": {s.value: c for s, c in by_status},
    }


@router.get("/vendors/pending", response_model=list[PendingVendorOut])
async def list_pending_vendors(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_or_staff("vendors.view")),
):
    stmt = (
        select(User, Company)
        .join(Company, User.company_id == Company.id)
        .where(User.role == UserRole.vendor, Company.status == CompanyStatus.PENDING_APPROVAL)
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [
        PendingVendorOut(
            company_id=c.id,
            bin=c.bin,
            company_name=c.name,
            legal_address=c.legal_address,
            chairman_name=c.chairman_name,
            bank_iik=c.bank_iik,
            bank_bik=c.bank_bik,
            user_id=u.id,
            user_phone=u.phone,
            user_name=u.name,
        )
        for u, c in rows
    ]


@router.post("/vendors/{company_id}/approve")
async def approve_vendor(
    request: Request,
    company_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_or_staff("vendors.approve")),
):
    result = await db.execute(
        select(Company).where(Company.id == company_id)
    )
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(404, "Company not found")
    if company.status == CompanyStatus.APPROVED:
        return {"message": "Already approved"}
    company.status = CompanyStatus.APPROVED
    await db.flush()
    ip = get_client_ip(request)
    if isinstance(current_user, Staff):
        await write_staff_audit_log(
            db, current_user.id, "vendor_approve",
            entity_type="company", entity_id=company_id, ip=ip, company_id=company_id,
        )
    else:
        await write_audit_log(
            db, current_user.id, company_id, "vendor_approve",
            entity_type="company", entity_id=company_id, ip=ip,
        )
    return {"message": "Vendor approved", "company_id": company_id}


@router.post("/vendors/{company_id}/reject")
async def reject_vendor(
    request: Request,
    company_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_or_staff("vendors.approve")),
):
    result = await db.execute(
        select(Company).where(Company.id == company_id)
    )
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(404, "Company not found")
    company.status = CompanyStatus.REJECTED
    await db.flush()
    ip = get_client_ip(request)
    if isinstance(current_user, Staff):
        await write_staff_audit_log(
            db, current_user.id, "vendor_reject",
            entity_type="company", entity_id=company_id, ip=ip, company_id=company_id,
        )
    else:
        await write_audit_log(
            db, current_user.id, company_id, "vendor_reject",
            entity_type="company", entity_id=company_id, ip=ip,
        )
    return {"message": "Vendor rejected", "company_id": company_id}


# --- Feedback (support tickets) ---

def _feedback_message_out(m: FeedbackMessage) -> FeedbackMessageOut:
    return FeedbackMessageOut(
        id=m.id, ticket_id=m.ticket_id, sender_type=m.sender_type,
        sender_user_id=m.sender_user_id, sender_staff_id=m.sender_staff_id,
        message=m.message, created_at=m.created_at,
    )


def _feedback_to_admin_out(
    ticket: FeedbackTicket,
    user: User | None,
    order_number: str | None = None,
    product_name: str | None = None,
    messages_override: list | None = None,
) -> FeedbackTicketAdminOut:
    if messages_override is not None:
        msg_list = messages_override
    else:
        msg_list = [_feedback_message_out(m) for m in getattr(ticket, "messages", []) or []]
    created_utc = ticket.created_at.replace(tzinfo=timezone.utc) if ticket.created_at.tzinfo is None else ticket.created_at
    overdue = (
        ticket.status != FeedbackStatus.resolved
        and (datetime.now(timezone.utc) - created_utc).total_seconds() > 24 * 3600
    )
    assigned = getattr(ticket, "assigned_to", None)
    return FeedbackTicketAdminOut(
        id=ticket.id,
        user_id=ticket.user_id,
        user_phone=user.phone if user else None,
        user_name=user.name if user else None,
        subject=ticket.subject,
        message=ticket.message,
        contact_phone=ticket.contact_phone,
        status=ticket.status,
        priority=getattr(ticket, "priority", "normal"),
        category=getattr(ticket, "category", None),
        assigned_to_id=getattr(ticket, "assigned_to_id", None),
        assigned_to_name=assigned.name if assigned else None,
        admin_notes=ticket.admin_notes,
        order_id=ticket.order_id,
        order_number=order_number,
        product_id=ticket.product_id,
        product_name=product_name,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        messages=msg_list,
        overdue=overdue,
    )


def _build_feedback_base(
    status: FeedbackStatus | None,
    user_id: int | None,
    assigned_to_me: bool,
    overdue: bool,
    unanswered: bool,
    current_user,
):
    base = (
        select(FeedbackTicket)
        .options(selectinload(FeedbackTicket.assigned_to))
        .order_by(FeedbackTicket.created_at.desc())
    )
    if status is not None:
        base = base.where(FeedbackTicket.status == status)
    if user_id is not None:
        base = base.where(FeedbackTicket.user_id == user_id)
    if assigned_to_me and isinstance(current_user, Staff):
        base = base.where(FeedbackTicket.assigned_to_id == current_user.id)
    if overdue:
        threshold = datetime.now(timezone.utc) - timedelta(hours=24)
        base = base.where(
            FeedbackTicket.status != FeedbackStatus.resolved,
            FeedbackTicket.created_at < threshold,
        )
    if unanswered:
        has_staff_reply = exists().where(
            FeedbackMessage.ticket_id == FeedbackTicket.id,
            FeedbackMessage.sender_type == "staff",
        )
        base = base.where(~has_staff_reply)
    return base


@router.get("/feedback")
async def list_feedback(
    status: FeedbackStatus | None = Query(None),
    user_id: int | None = Query(None),
    assigned_to_me: bool = Query(False),
    overdue: bool = Query(False),
    unanswered: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_or_staff("feedback.view")),
):
    try:
        return await _list_feedback_impl(
            status, user_id, assigned_to_me, overdue, unanswered, limit, offset, db, current_user
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Admin list feedback failed: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")


async def _list_feedback_impl(
    status: FeedbackStatus | None,
    user_id: int | None,
    assigned_to_me: bool,
    overdue: bool,
    unanswered: bool,
    limit: int,
    offset: int,
    db: AsyncSession,
    current_user,
):
    base = _build_feedback_base(status, user_id, assigned_to_me, overdue, unanswered, current_user)
    base_with_messages = base.options(selectinload(FeedbackTicket.messages))
    load_messages = True
    try:
        subq = base_with_messages.subquery()
        total = (await db.execute(select(func.count()).select_from(subq))).scalar() or 0
        stmt = base_with_messages.offset(offset).limit(limit)
        result = await db.execute(stmt)
        tickets = result.scalars().unique().all()
    except (ProgrammingError, OperationalError, AttributeError):
        await db.rollback()
        base_fallback = _build_feedback_base(status, user_id, assigned_to_me, overdue, False, current_user)
        subq = base_fallback.subquery()
        total = (await db.execute(select(func.count()).select_from(subq))).scalar() or 0
        stmt = base_fallback.offset(offset).limit(limit)
        result = await db.execute(stmt)
        tickets = result.scalars().unique().all()
        load_messages = False
    user_ids = [t.user_id for t in tickets if t.user_id]
    users_map: dict[int, User] = {}
    if user_ids:
        u_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        users_map = {u.id: u for u in u_result.scalars().all()}
    order_ids = [t.order_id for t in tickets if t.order_id]
    product_ids = [t.product_id for t in tickets if t.product_id]
    orders_map: dict[int, Order] = {}
    if order_ids:
        o_result = await db.execute(select(Order).where(Order.id.in_(order_ids)))
        orders_map = {o.id: o for o in o_result.scalars().all()}
    products_map: dict[int, Product] = {}
    if product_ids:
        p_result = await db.execute(select(Product).where(Product.id.in_(product_ids)))
        products_map = {p.id: p for p in p_result.scalars().all()}
    try:
        items = [
            _feedback_to_admin_out(
                t,
                users_map.get(t.user_id) if t.user_id else None,
                order_number=orders_map[t.order_id].order_number if t.order_id and t.order_id in orders_map else None,
                product_name=products_map[t.product_id].name if t.product_id and t.product_id in products_map else None,
                messages_override=[] if not load_messages else None,
            )
            for t in tickets
        ]
    except (ProgrammingError, OperationalError, AttributeError, TypeError, ValueError):
        items = []
        total = 0
    return {"items": items, "total": total}


@router.get("/feedback/reply-templates", response_model=list[ReplyTemplateOut])
async def list_reply_templates(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_or_staff("feedback.view")),
):
    result = await db.execute(select(ReplyTemplate).order_by(ReplyTemplate.id))
    return list(result.scalars().all())


@router.post("/feedback/reply-templates", response_model=ReplyTemplateOut)
async def create_reply_template(
    body: ReplyTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_or_staff("feedback.edit")),
):
    t = ReplyTemplate(name=body.name.strip(), body=body.body.strip())
    db.add(t)
    await db.flush()
    await db.refresh(t)
    return t


@router.get("/feedback/{ticket_id}", response_model=FeedbackTicketAdminOut)
async def get_feedback(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_or_staff("feedback.view")),
):
    result = await db.execute(
        select(FeedbackTicket)
        .where(FeedbackTicket.id == ticket_id)
        .options(selectinload(FeedbackTicket.messages), selectinload(FeedbackTicket.assigned_to))
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(404, "Feedback ticket not found")
    user = None
    if ticket.user_id:
        user = await db.get(User, ticket.user_id)
    order_number: str | None = None
    if ticket.order_id:
        order = await db.get(Order, ticket.order_id)
        if order:
            order_number = order.order_number
    product_name: str | None = None
    if ticket.product_id:
        product = await db.get(Product, ticket.product_id)
        if product:
            product_name = product.name
    return _feedback_to_admin_out(ticket, user, order_number=order_number, product_name=product_name)


@router.patch("/feedback/{ticket_id}", response_model=FeedbackTicketAdminOut)
async def update_feedback(
    request: Request,
    ticket_id: int,
    body: FeedbackTicketUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_or_staff("feedback.edit")),
):
    result = await db.execute(select(FeedbackTicket).where(FeedbackTicket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(404, "Feedback ticket not found")
    if body.status is not None:
        ticket.status = body.status
    if body.priority is not None:
        ticket.priority = (body.priority or "normal").strip() or "normal"
    if body.category is not None:
        ticket.category = (body.category or "").strip() or None
    if body.assigned_to_id is not None:
        ticket.assigned_to_id = body.assigned_to_id if body.assigned_to_id else None
    if body.admin_notes is not None:
        ticket.admin_notes = body.admin_notes
    if body.send_reply and body.send_reply.strip():
        if not ticket.user_id:
            raise HTTPException(
                400,
                "Нельзя отправить ответ в приложение: обращение анонимное. Ответьте по указанному контакту (email/телефон).",
            )
        reply_text = body.send_reply.strip()
        msg = FeedbackMessage(
            ticket_id=ticket_id,
            sender_type="staff",
            sender_user_id=current_user.id if not isinstance(current_user, Staff) else None,
            sender_staff_id=current_user.id if isinstance(current_user, Staff) else None,
            message=reply_text,
        )
        db.add(msg)
        await db.flush()
        notification = Notification(
            user_id=ticket.user_id,
            type="support_message",
            payload={"text": reply_text},
        )
        db.add(notification)
        await db.flush()
    await db.flush()
    ip = get_client_ip(request)
    details = {}
    if body.status is not None:
        details["status"] = body.status.value if hasattr(body.status, "value") else str(body.status)
    if body.send_reply and body.send_reply.strip():
        details["reply_sent"] = True
    if details:
        if isinstance(current_user, Staff):
            await write_staff_audit_log(
                db, current_user.id, "feedback_update",
                entity_type="feedback_ticket", entity_id=ticket_id, details=details, ip=ip,
            )
        else:
            await write_audit_log(
                db, current_user.id, None, "feedback_update",
                entity_type="feedback_ticket", entity_id=ticket_id, details=details, ip=ip,
            )
    await db.refresh(ticket, ["messages", "assigned_to"])
    user = await db.get(User, ticket.user_id) if ticket.user_id else None
    order_number: str | None = None
    if ticket.order_id:
        order = await db.get(Order, ticket.order_id)
        if order:
            order_number = order.order_number
    product_name: str | None = None
    if ticket.product_id:
        product = await db.get(Product, ticket.product_id)
        if product:
            product_name = product.name
    return _feedback_to_admin_out(ticket, user, order_number=order_number, product_name=product_name)


# --- Admin orders ---

async def _load_product_map_for_orders(db: AsyncSession, orders: list[Order]) -> dict[int, Product]:
    product_ids = [oi.product_id for o in orders for oi in o.items]
    if not product_ids:
        return {}
    result = await db.execute(select(Product).where(Product.id.in_(product_ids)))
    return {p.id: p for p in result.scalars().all()}


def _order_to_admin_out(
    order: Order,
    product_map: dict[int, Product],
    user_phone: str | None = None,
    vendor_phone: str | None = None,
) -> AdminOrderOut:
    items = [
        OrderItemOut(
            id=oi.id,
            product_id=oi.product_id,
            quantity=oi.quantity,
            price_at_order=Decimal(str(oi.price_at_order)),
            name=p.name if (p := product_map.get(oi.product_id)) else None,
            article_number=p.article_number if (p := product_map.get(oi.product_id)) else None,
        )
        for oi in order.items
    ]
    return AdminOrderOut(
        id=order.id,
        order_number=order.order_number,
        user_id=order.user_id,
        vendor_id=order.vendor_id,
        total_amount=Decimal(str(order.total_amount)),
        status=order.status,
        delivery_address=order.delivery_address,
        comment=order.comment,
        created_at=order.created_at,
        items=items,
        user_phone=user_phone,
        vendor_phone=vendor_phone,
    )


@router.get("/orders", response_model=list[AdminOrderOut])
async def list_admin_orders(
    status: OrderStatus | None = Query(None),
    user_id: int | None = Query(None),
    vendor_id: int | None = Query(None),
    order_number: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_or_staff("orders.view")),
):
    stmt = (
        select(Order)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if status is not None:
        stmt = stmt.where(Order.status == status)
    if user_id is not None:
        stmt = stmt.where(Order.user_id == user_id)
    if vendor_id is not None:
        stmt = stmt.where(Order.vendor_id == vendor_id)
    if order_number is not None and order_number.strip():
        stmt = stmt.where(Order.order_number.ilike(f"%{order_number.strip()}%"))
    result = await db.execute(stmt)
    orders = result.scalars().unique().all()
    product_map = await _load_product_map_for_orders(db, orders)
    user_ids = list({o.user_id for o in orders} | {o.vendor_id for o in orders})
    users_map: dict[int, User] = {}
    if user_ids:
        u_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        users_map = {u.id: u for u in u_result.scalars().all()}
    return [
        _order_to_admin_out(
            o,
            product_map,
            user_phone=users_map.get(o.user_id).phone if users_map.get(o.user_id) else None,
            vendor_phone=users_map.get(o.vendor_id).phone if users_map.get(o.vendor_id) else None,
        )
        for o in orders
    ]


@router.get("/orders/{order_id}", response_model=AdminOrderOut)
async def get_admin_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_or_staff("orders.view")),
):
    result = await db.execute(
        select(Order).where(Order.id == order_id).options(selectinload(Order.items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    product_map = await _load_product_map_for_orders(db, [order])
    user = await db.get(User, order.user_id)
    vendor = await db.get(User, order.vendor_id)
    return _order_to_admin_out(
        order,
        product_map,
        user_phone=user.phone if user else None,
        vendor_phone=vendor.phone if vendor else None,
    )


# --- Global search ---

@router.get("/search")
async def admin_search(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_or_staff("search.view")),
):
    q_trim = q.strip()
    if not q_trim:
        return {"users": [], "orders": [], "products": [], "companies": [], "feedback": []}
    out = {"users": [], "orders": [], "products": [], "companies": [], "feedback": []}
    # Users: phone, name
    u_stmt = select(User.id, User.phone, User.name).where(
        or_(User.phone.ilike(f"%{q_trim}%"), User.name.ilike(f"%{q_trim}%"))
    ).limit(10)
    u_result = await db.execute(u_stmt)
    for row in u_result.all():
        out["users"].append({"id": row.id, "phone": row.phone, "name": row.name})
    # Orders: by id if q is number, or by order_number (return id + order_number)
    if q_trim.isdigit():
        o_result = await db.execute(
            select(Order.id, Order.order_number).where(Order.id == int(q_trim)).limit(1)
        )
        o_row = o_result.first()
        if o_row is not None:
            out["orders"].append({"id": o_row[0], "order_number": o_row[1]})
    o_by_num = await db.execute(
        select(Order.id, Order.order_number).where(Order.order_number.ilike(f"%{q_trim}%")).limit(10)
    )
    for row in o_by_num.all():
        oid, onum = row[0], row[1]
        if not any(x["id"] == oid for x in out["orders"]):
            out["orders"].append({"id": oid, "order_number": onum})
    # Products: name, article_number
    p_stmt = select(Product.id, Product.name, Product.article_number).where(
        or_(
            Product.name.ilike(f"%{q_trim}%"),
            Product.article_number.ilike(f"%{q_trim}%"),
        )
    ).limit(10)
    p_result = await db.execute(p_stmt)
    for row in p_result.all():
        out["products"].append({"id": row.id, "name": row.name, "article_number": row.article_number})
    # Companies: bin, name
    c_stmt = select(Company.id, Company.bin, Company.name).where(
        or_(Company.bin.ilike(f"%{q_trim}%"), Company.name.ilike(f"%{q_trim}%"))
    ).limit(10)
    c_result = await db.execute(c_stmt)
    for row in c_result.all():
        out["companies"].append({"id": row.id, "bin": row.bin, "name": row.name})
    # Feedback: subject, message
    f_stmt = select(FeedbackTicket.id, FeedbackTicket.subject).where(
        or_(
            FeedbackTicket.subject.ilike(f"%{q_trim}%"),
            FeedbackTicket.message.ilike(f"%{q_trim}%"),
        )
    ).limit(10)
    f_result = await db.execute(f_stmt)
    for row in f_result.all():
        out["feedback"].append({"id": row.id, "subject": row.subject})
    return out


# --- Dashboard ---

DASHBOARD_CACHE_TTL = 300  # 5 minutes


@router.get("/dashboard")
async def admin_dashboard(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_or_staff("dashboard.view")),
):
    cache_key = f"admin:dashboard:{date_from or 'all'}:{date_to or 'all'}"
    try:
        r = await get_redis()
        cached = await r.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass
    order_date_filter = None
    if date_from is not None:
        order_date_filter = Order.created_at >= datetime.combine(date_from, datetime.min.time()).replace(tzinfo=timezone.utc)
    if date_to is not None:
        to_dt = datetime.combine(date_to, datetime.max.time()).replace(tzinfo=timezone.utc)
        order_date_filter = (Order.created_at <= to_dt) if order_date_filter is None else (order_date_filter & (Order.created_at <= to_dt))
    def _orders_where(stmt):
        return stmt.where(order_date_filter) if order_date_filter is not None else stmt
    total_orders = (await db.execute(_orders_where(select(func.count()).select_from(Order)))).scalar() or 0
    total_revenue = (await db.execute(_orders_where(select(func.coalesce(func.sum(Order.total_amount), 0)).select_from(Order)))).scalar() or 0
    by_status = (await db.execute(_orders_where(select(Order.status, func.count(Order.id)).group_by(Order.status)))).all()
    recent_orders_stmt = (
        select(Order)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
        .limit(10)
    )
    if order_date_filter is not None:
        recent_orders_stmt = recent_orders_stmt.where(order_date_filter)
    recent_orders_result = await db.execute(recent_orders_stmt)
    recent_orders = recent_orders_result.scalars().unique().all()
    product_map = await _load_product_map_for_orders(db, recent_orders)
    user_ids = list({o.user_id for o in recent_orders} | {o.vendor_id for o in recent_orders})
    users_map: dict[int, User] = {}
    if user_ids:
        u_res = await db.execute(select(User).where(User.id.in_(user_ids)))
        users_map = {u.id: u for u in u_res.scalars().all()}
    recent_orders_out = [
        _order_to_admin_out(
            o, product_map,
            user_phone=users_map.get(o.user_id).phone if users_map.get(o.user_id) else None,
            vendor_phone=users_map.get(o.vendor_id).phone if users_map.get(o.vendor_id) else None,
        )
        for o in recent_orders
    ]
    recent_users_stmt = select(User).order_by(User.id.desc()).limit(10)
    recent_users_result = await db.execute(recent_users_stmt)
    recent_users = recent_users_result.scalars().all()
    recent_users_out = [
        {"id": u.id, "phone": u.phone, "name": u.name, "role": u.role.value}
        for u in recent_users
    ]
    pending_vendors_count = (
        await db.execute(
            select(func.count())
            .select_from(User)
            .join(Company, User.company_id == Company.id)
            .where(User.role == UserRole.vendor, Company.status == CompanyStatus.PENDING_APPROVAL)
        )
    ).scalar() or 0
    open_feedback_count = (
        await db.execute(
            select(func.count()).select_from(FeedbackTicket).where(
                FeedbackTicket.status.in_([FeedbackStatus.open, FeedbackStatus.in_progress])
            )
        )
    ).scalar() or 0
    recent_reviews_result = await db.execute(
        select(ProductReview, Product.name)
        .join(Product, ProductReview.product_id == Product.id)
        .order_by(ProductReview.created_at.desc())
        .limit(5)
    )
    recent_reviews = [
        {"review_id": r.id, "product_id": r.product_id, "product_name": name, "rating": r.rating, "created_at": r.created_at.isoformat()}
        for r, name in recent_reviews_result.all()
    ]
    out = {
        "total_orders": total_orders,
        "total_revenue": float(total_revenue),
        "by_status": {s.value: c for s, c in by_status},
        "recent_orders": recent_orders_out,
        "recent_users": recent_users_out,
        "pending_vendors_count": pending_vendors_count,
        "open_feedback_count": open_feedback_count,
        "recent_reviews": recent_reviews,
    }
    try:
        r = await get_redis()
        await r.setex(cache_key, DASHBOARD_CACHE_TTL, json.dumps(out, default=str))
    except Exception:
        pass
    return out


# --- Send notification to user ---

class SendNotificationIn(BaseModel):
    user_id: int
    message: str


@router.post("/notifications/send")
async def send_notification(
    body: SendNotificationIn,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_or_staff("users.edit")),
):
    user = await db.get(User, body.user_id)
    if not user:
        raise HTTPException(404, "User not found")
    notification = Notification(
        user_id=body.user_id,
        type="support_message",
        payload={"text": body.message},
    )
    db.add(notification)
    await db.flush()
    return {"message": "Notification sent", "user_id": body.user_id}


# --- Audit log ---

@router.get("/audit-log")
async def admin_audit_log(
    company_id: int | None = Query(None),
    user_id: int | None = Query(None),
    staff_id: int | None = Query(None),
    action: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_or_staff("audit.view")),
):
    """List audit log entries. Optional filters: company_id, user_id, staff_id, action."""
    try:
        return await _admin_audit_log_impl(
            company_id, user_id, staff_id, action, limit, offset, db
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Admin audit log failed: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")


async def _admin_audit_log_impl(
    company_id: int | None,
    user_id: int | None,
    staff_id: int | None,
    action: str | None,
    limit: int,
    offset: int,
    db: AsyncSession,
):
    try:
        stmt = (
            select(AuditLog, User.phone, User.name, Staff.login)
            .outerjoin(User, AuditLog.user_id == User.id)
            .outerjoin(Staff, AuditLog.staff_id == Staff.id)
            .order_by(AuditLog.created_at.desc())
        )
        count_stmt = select(func.count()).select_from(AuditLog)
        if company_id is not None:
            stmt = stmt.where(AuditLog.company_id == company_id)
            count_stmt = count_stmt.where(AuditLog.company_id == company_id)
        if user_id is not None:
            stmt = stmt.where(AuditLog.user_id == user_id)
            count_stmt = count_stmt.where(AuditLog.user_id == user_id)
        if staff_id is not None:
            stmt = stmt.where(AuditLog.staff_id == staff_id)
            count_stmt = count_stmt.where(AuditLog.staff_id == staff_id)
        if action:
            stmt = stmt.where(AuditLog.action == action)
            count_stmt = count_stmt.where(AuditLog.action == action)
        total = (await db.execute(count_stmt)).scalar() or 0
        stmt = stmt.offset(offset).limit(limit)
        result = await db.execute(stmt)
        rows = result.all()
        items = [
            AuditLogOut(
                id=log.id,
                user_id=log.user_id,
                user_phone=phone,
                user_name=name,
                staff_id=log.staff_id,
                staff_login=staff_login,
                company_id=log.company_id,
                action=log.action,
                entity_type=log.entity_type,
                entity_id=log.entity_id,
                details=log.details,
                created_at=log.created_at,
            )
            for log, phone, name, staff_login in rows
        ]
        return {"items": items, "total": total}
    except (ProgrammingError, OperationalError, AttributeError) as e:
        err_msg = str(getattr(getattr(e, "orig", e), "args", [str(e)])) + str(e)
        if "staff_id" not in err_msg:
            raise
        await db.rollback()
        count_sql = "SELECT COUNT(*) FROM audit_logs a WHERE 1=1"
        list_sql = """
            SELECT a.id, a.user_id, a.company_id, a.action, a.entity_type, a.entity_id, a.details, a.created_at,
                   u.phone, u.name
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE 1=1
        """
        params: dict = {}
        if company_id is not None:
            count_sql += " AND a.company_id = :company_id"
            list_sql += " AND a.company_id = :company_id"
            params["company_id"] = company_id
        if user_id is not None:
            count_sql += " AND a.user_id = :user_id"
            list_sql += " AND a.user_id = :user_id"
            params["user_id"] = user_id
        if action:
            count_sql += " AND a.action = :action"
            list_sql += " AND a.action = :action"
            params["action"] = action
        list_sql += " ORDER BY a.created_at DESC LIMIT :limit OFFSET :offset"
        total = (await db.execute(text(count_sql), params)).scalar() or 0
        list_params = {**params, "limit": limit, "offset": offset}
        rows = (await db.execute(text(list_sql), list_params)).fetchall()
        items = [
            AuditLogOut(
                id=r.id,
                user_id=r.user_id,
                user_phone=r.phone,
                user_name=r.name,
                staff_id=None,
                staff_login=None,
                company_id=r.company_id,
                action=r.action,
                entity_type=r.entity_type,
                entity_id=r.entity_id,
                details=r.details,
                created_at=r.created_at,
            )
            for r in rows
        ]
        return {"items": items, "total": total}
