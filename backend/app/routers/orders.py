from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.order import Order, OrderStatus
from app.models.product import Product
from app.models.user import User, UserRole
from app.schemas.order import OrderOut, OrderItemOut
from app.dependencies import get_current_user, get_current_admin, get_current_vendor, get_client_ip
from app.services.sms import sms_gateway
from app.services.audit import write_audit_log

router = APIRouter()


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


async def _load_product_map_for_orders(db: AsyncSession, orders: list[Order]) -> dict[int, Product]:
    product_ids = [oi.product_id for o in orders for oi in o.items]
    if not product_ids:
        return {}
    result = await db.execute(select(Product).where(Product.id.in_(product_ids)))
    return {p.id: p for p in result.scalars().all()}


def _order_to_out(order: Order, product_map: dict[int, Product]) -> OrderOut:
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
    return OrderOut(
        id=order.id,
        user_id=order.user_id,
        vendor_id=order.vendor_id,
        total_amount=Decimal(str(order.total_amount)),
        status=order.status,
        delivery_address=order.delivery_address,
        comment=order.comment,
        created_at=order.created_at,
        items=items,
        order_number=order.order_number,
    )


@router.get("", response_model=list[OrderOut])
async def list_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """For vendor with company_id: list orders of all company vendors; otherwise own orders."""
    if current_user.role == UserRole.vendor:
        if current_user.company_id is not None:
            res = await db.execute(select(User.id).where(User.company_id == current_user.company_id))
            company_vendor_ids = [row[0] for row in res.all()]
            if company_vendor_ids:
                stmt = select(Order).where(Order.vendor_id.in_(company_vendor_ids)).options(selectinload(Order.items)).order_by(Order.created_at.desc())
            else:
                stmt = select(Order).where(Order.vendor_id == current_user.id).options(selectinload(Order.items)).order_by(Order.created_at.desc())
        else:
            stmt = select(Order).where(Order.vendor_id == current_user.id).options(selectinload(Order.items)).order_by(Order.created_at.desc())
    else:
        stmt = select(Order).where(Order.user_id == current_user.id).options(selectinload(Order.items)).order_by(Order.created_at.desc())
    result = await db.execute(stmt)
    orders = result.scalars().unique().all()
    products_map = await _load_product_map_for_orders(db, orders)
    return [_order_to_out(o, products_map) for o in orders]


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Access: buyer, order vendor, admin, or vendor from same company as order.vendor."""
    result = await db.execute(select(Order).where(Order.id == order_id).options(selectinload(Order.items)))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.user_id == current_user.id or order.vendor_id == current_user.id or current_user.role == UserRole.admin:
        products_map = await _load_product_map_for_orders(db, [order])
        return _order_to_out(order, products_map)
    if current_user.role == UserRole.vendor and current_user.company_id is not None:
        vendor_user = await db.get(User, order.vendor_id)
        if vendor_user and vendor_user.company_id == current_user.company_id:
            products_map = await _load_product_map_for_orders(db, [order])
            return _order_to_out(order, products_map)
    raise HTTPException(403, "Forbidden")


@router.patch("/{order_id}/status", response_model=OrderOut)
async def update_order_status(
    order_id: int,
    body: OrderStatusUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_vendor),
):
    """Admin or vendor of the order's company can change status."""
    result = await db.execute(select(Order).where(Order.id == order_id).options(selectinload(Order.items)))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    vendor_user = await db.get(User, order.vendor_id)
    company_id = vendor_user.company_id if vendor_user else None
    can_change = current_user.role == UserRole.admin or (
        current_user.company_id is not None and company_id == current_user.company_id
    )
    if not can_change:
        raise HTTPException(403, "Forbidden")
    order.status = body.status
    await db.flush()
    if company_id is not None:
        await write_audit_log(
            db,
            user_id=current_user.id,
            company_id=company_id,
            action="order_status_change",
            entity_type="order",
            entity_id=order_id,
            details={"status": body.status.value},
            ip=get_client_ip(request),
        )
        await db.flush()
    if body.status in (OrderStatus.shipped, OrderStatus.delivered):
        u = await db.get(User, order.user_id)
        if u and u.phone:
            await sms_gateway.send(u.phone, f"Заказ #{order_id}: статус {body.status.value}")
    await db.refresh(order)
    products_map = await _load_product_map_for_orders(db, [order])
    return _order_to_out(order, products_map)
