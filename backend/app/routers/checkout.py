from decimal import Decimal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.product import Product
from app.models.order import Order, OrderStatus, OrderItem
from app.models.user import User
from app.dependencies import get_current_user
from app.schemas.order import CheckoutIn, CheckoutOut
from app.services.cart_service import get_cart, clear_cart, CartUnavailableError
from app.utils.sanitize import sanitize_text

router = APIRouter()

CART_UNAVAILABLE_MSG = "Корзина временно недоступна. Попробуйте позже."


@router.post("", response_model=CheckoutOut)
async def checkout(
    body: CheckoutIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = await get_cart(current_user.id)
    if not items:
        raise HTTPException(400, "Cart is empty")
    delivery_address = sanitize_text(body.delivery_address, max_length=512)
    comment = sanitize_text(body.comment, max_length=1024)
    product_ids = [x["product_id"] for x in items]
    result = await db.execute(select(Product).where(Product.id.in_(product_ids)))
    products = {p.id: p for p in result.scalars().all()}
    # Check stock before creating orders
    for it in items:
        pid, qty = it["product_id"], it.get("quantity", 1)
        p = products.get(pid)
        if not p:
            raise HTTPException(400, f"Product {pid} not found")
        if p.stock_quantity < qty:
            raise HTTPException(
                400,
                f"Недостаточно товара: {p.name} (арт. {p.article_number}). В наличии: {p.stock_quantity}, запрошено: {qty}",
            )
    by_vendor: dict[int, list[tuple[Product, int]]] = {}
    for it in items:
        pid, qty = it["product_id"], it.get("quantity", 1)
        p = products.get(pid)
        if not p:
            continue
        if p.vendor_id not in by_vendor:
            by_vendor[p.vendor_id] = []
        by_vendor[p.vendor_id].append((p, qty))
    order_ids = []
    for vendor_id, rows in by_vendor.items():
        total = sum(Decimal(str(p.price)) * qty for p, qty in rows)
        order = Order(
            user_id=current_user.id,
            vendor_id=vendor_id,
            total_amount=total,
            status=OrderStatus.new,
            delivery_address=delivery_address,
            comment=comment,
        )
        db.add(order)
        await db.flush()
        order.order_number = f"ORD-{datetime.utcnow().year}-{order.id:06d}"
        await db.flush()
        for p, qty in rows:
            oi = OrderItem(order_id=order.id, product_id=p.id, quantity=qty, price_at_order=p.price)
            db.add(oi)
            p.stock_quantity -= qty
        order_ids.append(order.id)
    try:
        await clear_cart(current_user.id)
    except CartUnavailableError:
        raise HTTPException(503, CART_UNAVAILABLE_MSG)
    await db.flush()
    return CheckoutOut(order_ids=order_ids, message="Orders created")