from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.product import Product
from app.models.user import User
from app.schemas.cart import CartItemIn, CartItemOut
from app.dependencies import get_current_user
from app.services.cart_service import get_cart as get_cart_items, set_cart, CartUnavailableError

router = APIRouter()

CART_UNAVAILABLE_MSG = "Корзина временно недоступна. Попробуйте позже."


@router.get("", response_model=list[CartItemOut])
async def get_cart(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = await get_cart_items(current_user.id)
    if not items:
        return []
    product_ids = [x["product_id"] for x in items]
    result = await db.execute(select(Product).where(Product.id.in_(product_ids)))
    products = {p.id: p for p in result.scalars().all()}
    out = []
    for it in items:
        pid, qty = it["product_id"], it.get("quantity", 1)
        p = products.get(pid)
        if not p:
            continue
        out.append(CartItemOut(product_id=pid, quantity=qty, vendor_id=p.vendor_id, price=float(p.price), name=p.name, article_number=p.article_number))
    return out


@router.post("/items")
async def add_to_cart(
    body: CartItemIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Product).where(Product.id == body.product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")
    items = await get_cart_items(current_user.id)
    found = False
    for it in items:
        if it["product_id"] == body.product_id:
            it["quantity"] = it.get("quantity", 0) + body.quantity
            found = True
            break
    if not found:
        items.append({"product_id": body.product_id, "quantity": body.quantity, "vendor_id": product.vendor_id})
    try:
        await set_cart(current_user.id, items)
    except CartUnavailableError:
        raise HTTPException(503, CART_UNAVAILABLE_MSG)
    return {"message": "Added"}


@router.delete("/items/{product_id}", status_code=204)
async def remove_from_cart(
    product_id: int,
    current_user: User = Depends(get_current_user),
):
    items = await get_cart_items(current_user.id)
    items = [x for x in items if x["product_id"] != product_id]
    try:
        await set_cart(current_user.id, items)
    except CartUnavailableError:
        raise HTTPException(503, CART_UNAVAILABLE_MSG)
