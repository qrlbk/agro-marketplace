from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.user import User, UserRole
from app.models.company import Company, CompanyStatus
from app.models.order import Order, OrderStatus, OrderItem
from app.models.feedback import FeedbackTicket, FeedbackStatus
from app.models.notification import Notification
from app.models.product import Product
from app.models.audit_log import AuditLog
from app.models.product_review import ProductReview
from app.schemas.user import UserOut
from app.schemas.order import OrderItemOut, AdminOrderOut
from app.schemas.feedback import FeedbackTicketAdminOut, FeedbackTicketUpdate
from app.schemas.audit import AuditLogOut
from app.dependencies import require_admin_or_staff
from pydantic import BaseModel

router = APIRouter()


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


@router.get("/users", response_model=list[UserOut])
async def list_users(
    role: UserRole | None = Query(None),
    phone: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_or_staff("users.view")),
):
    stmt = select(User).options(selectinload(User.company)).order_by(User.id)
    if role:
        stmt = stmt.where(User.role == role)
    if phone and phone.strip():
        stmt = stmt.where(User.phone.ilike(f"%{phone.strip()}%"))
    result = await db.execute(stmt)
    users = result.scalars().all()
    return [
        UserOut(
            id=u.id,
            role=u.role,
            phone=u.phone,
            name=u.name,
            region=u.region,
            company_id=u.company_id,
            company_details=u.company_details,
            company_status=u.company.status.value if u.company else None,
        )
        for u in users
    ]


@router.patch("/users/{user_id}/role", response_model=UserOut)
async def set_user_role(
    user_id: int,
    body: UserUpdateRole,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_or_staff("users.edit")),
):
    result = await db.execute(
        select(User).where(User.id == user_id).options(selectinload(User.company))
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
    return {"message": "Vendor approved", "company_id": company_id}


@router.post("/vendors/{company_id}/reject")
async def reject_vendor(
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
    company.status = CompanyStatus.PENDING_APPROVAL
    await db.flush()
    return {"message": "Vendor remains pending (reject does not change status)"}


# --- Feedback (support tickets) ---

def _feedback_to_admin_out(
    ticket: FeedbackTicket,
    user: User | None,
    order_number: str | None = None,
    product_name: str | None = None,
) -> FeedbackTicketAdminOut:
    return FeedbackTicketAdminOut(
        id=ticket.id,
        user_id=ticket.user_id,
        user_phone=user.phone if user else None,
        user_name=user.name if user else None,
        subject=ticket.subject,
        message=ticket.message,
        contact_phone=ticket.contact_phone,
        status=ticket.status,
        admin_notes=ticket.admin_notes,
        order_id=ticket.order_id,
        order_number=order_number,
        product_id=ticket.product_id,
        product_name=product_name,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
    )


@router.get("/feedback", response_model=list[FeedbackTicketAdminOut])
async def list_feedback(
    status: FeedbackStatus | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_or_staff("feedback.view")),
):
    stmt = select(FeedbackTicket).order_by(FeedbackTicket.created_at.desc()).limit(limit).offset(offset)
    if status is not None:
        stmt = stmt.where(FeedbackTicket.status == status)
    result = await db.execute(stmt)
    tickets = result.scalars().all()
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
    return [
        _feedback_to_admin_out(
            t,
            users_map.get(t.user_id) if t.user_id else None,
            order_number=orders_map[t.order_id].order_number if t.order_id and t.order_id in orders_map else None,
            product_name=products_map[t.product_id].name if t.product_id and t.product_id in products_map else None,
        )
        for t in tickets
    ]


@router.get("/feedback/{ticket_id}", response_model=FeedbackTicketAdminOut)
async def get_feedback(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_or_staff("feedback.view")),
):
    result = await db.execute(select(FeedbackTicket).where(FeedbackTicket.id == ticket_id))
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
    if body.admin_notes is not None:
        ticket.admin_notes = body.admin_notes
    if body.send_reply and body.send_reply.strip():
        if ticket.user_id:
            notification = Notification(
                user_id=ticket.user_id,
                type="support_message",
                payload={"text": body.send_reply.strip()},
            )
            db.add(notification)
            await db.flush()
    await db.flush()
    await db.refresh(ticket)
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

@router.get("/dashboard")
async def admin_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_or_staff("dashboard.view")),
):
    total_orders = (await db.execute(select(func.count()).select_from(Order))).scalar() or 0
    total_revenue = (await db.execute(select(func.coalesce(func.sum(Order.total_amount), 0)).select_from(Order))).scalar() or 0
    by_status = (
        await db.execute(select(Order.status, func.count(Order.id)).group_by(Order.status))
    ).all()
    recent_orders_stmt = (
        select(Order)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
        .limit(10)
    )
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
    return {
        "total_orders": total_orders,
        "total_revenue": float(total_revenue),
        "by_status": {s.value: c for s, c in by_status},
        "recent_orders": recent_orders_out,
        "recent_users": recent_users_out,
        "pending_vendors_count": pending_vendors_count,
        "open_feedback_count": open_feedback_count,
        "recent_reviews": recent_reviews,
    }


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
    action: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin_or_staff("audit.view")),
):
    """List audit log entries. Admin only. Optional filters: company_id, user_id, action."""
    stmt = (
        select(AuditLog, User.phone, User.name)
        .outerjoin(User, AuditLog.user_id == User.id)
        .order_by(AuditLog.created_at.desc())
    )
    count_stmt = select(func.count()).select_from(AuditLog)
    if company_id is not None:
        stmt = stmt.where(AuditLog.company_id == company_id)
        count_stmt = count_stmt.where(AuditLog.company_id == company_id)
    if user_id is not None:
        stmt = stmt.where(AuditLog.user_id == user_id)
        count_stmt = count_stmt.where(AuditLog.user_id == user_id)
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
