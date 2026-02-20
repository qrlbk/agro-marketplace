from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.order import Order, OrderStatus
from app.models.product import Product
from app.models.user import User, UserRole
from app.schemas.order import OrderOut, OrderItemOut
from app.dependencies import get_current_user, get_current_admin
from app.services.sms import sms_gateway

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
    )


@router.get("", response_model=list[OrderOut])
async def list_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.vendor:
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
    result = await db.execute(select(Order).where(Order.id == order_id).options(selectinload(Order.items)))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.user_id != current_user.id and order.vendor_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(403, "Forbidden")
    products_map = await _load_product_map_for_orders(db, [order])
    return _order_to_out(order, products_map)


@router.patch("/{order_id}/status", response_model=OrderOut)
async def update_order_status(
    order_id: int,
    body: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    result = await db.execute(select(Order).where(Order.id == order_id).options(selectinload(Order.items)))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    order.status = body.status
    await db.flush()
    if body.status in (OrderStatus.shipped, OrderStatus.delivered):
        u = await db.get(User, order.user_id)
        if u and u.phone:
            await sms_gateway.send(u.phone, f"Заказ #{order_id}: статус {body.status.value}")
    await db.refresh(order)
    products_map = await _load_product_map_for_orders(db, [order])
    return _order_to_out(order, products_map)
