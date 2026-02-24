"""Critical path tests: checkout, stock, empty cart."""
import pytest
from datetime import datetime, timedelta
from jose import jwt
from sqlalchemy import select

from app.config import settings
from app.models.user import User, UserRole
from app.models.product import Product, ProductStatus
from app.models.order import Order, OrderItem
from app.services.cart_service import set_cart, clear_cart


def _make_token(user_id: int, role: UserRole, phone: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_access_expire_minutes)
    payload = {"sub": str(user_id), "role": role.value, "phone": phone, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


@pytest.mark.asyncio
async def test_checkout_empty_cart_returns_400(client_with_db, db_session):
    """POST /checkout with empty cart returns 400."""
    user = User(role=UserRole.farmer, phone="+77001110001", name="Test Buyer")
    db_session.add(user)
    await db_session.flush()

    token = _make_token(user.id, user.role, user.phone)
    response = await client_with_db.post(
        "/checkout",
        json={"delivery_address": "Test address", "comment": None},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400
    detail = (response.json().get("detail") or "").lower() if isinstance(response.json().get("detail"), str) else ""
    assert "empty" in detail or "cart" in detail


@pytest.mark.asyncio
async def test_checkout_insufficient_stock_returns_400(client_with_db, db_session):
    """POST /checkout when requested quantity exceeds stock returns 400."""
    buyer = User(role=UserRole.farmer, phone="+77001110002", name="Buyer")
    vendor = User(role=UserRole.vendor, phone="+77001110003", name="Vendor")
    db_session.add(buyer)
    db_session.add(vendor)
    await db_session.flush()

    product = Product(
        vendor_id=vendor.id,
        category_id=None,
        name="Test Product",
        article_number="ART-STOCK-001",
        price=100.0,
        stock_quantity=2,
        status=ProductStatus.in_stock,
    )
    db_session.add(product)
    await db_session.flush()

    await set_cart(buyer.id, [
        {"product_id": product.id, "quantity": 5, "vendor_id": vendor.id},
    ])

    token = _make_token(buyer.id, buyer.role, buyer.phone)
    response = await client_with_db.post(
        "/checkout",
        json={"delivery_address": "Address", "comment": None},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400
    detail = response.json().get("detail", "")
    assert "недостаточно" in detail.lower() or "stock" in detail.lower() or "наличии" in detail.lower()

    await clear_cart(buyer.id)


@pytest.mark.asyncio
async def test_checkout_success_creates_orders_and_decreases_stock(client_with_db, db_session):
    """POST /checkout with valid cart returns 200, creates orders, decreases stock, clears cart."""
    buyer = User(role=UserRole.farmer, phone="+77001110004", name="Buyer")
    vendor = User(role=UserRole.vendor, phone="+77001110005", name="Vendor")
    db_session.add(buyer)
    db_session.add(vendor)
    await db_session.flush()

    product = Product(
        vendor_id=vendor.id,
        category_id=None,
        name="Test Product Checkout",
        article_number="ART-CHK-001",
        price=50.0,
        stock_quantity=10,
        status=ProductStatus.in_stock,
    )
    db_session.add(product)
    await db_session.flush()

    await set_cart(buyer.id, [
        {"product_id": product.id, "quantity": 2, "vendor_id": vendor.id},
    ])

    token = _make_token(buyer.id, buyer.role, buyer.phone)
    response = await client_with_db.post(
        "/checkout",
        json={"delivery_address": "Delivery str. 1", "comment": "Please call"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "order_ids" in data
    assert len(data["order_ids"]) == 1
    assert data.get("message")

    await db_session.refresh(product)
    assert product.stock_quantity == 8

    result = await db_session.execute(select(Order).where(Order.user_id == buyer.id))
    orders = result.scalars().all()
    assert len(orders) == 1
    assert orders[0].total_amount == 100
    assert orders[0].vendor_id == vendor.id

    result = await db_session.execute(select(OrderItem).where(OrderItem.order_id == orders[0].id))
    items = result.scalars().all()
    assert len(items) == 1
    assert items[0].product_id == product.id
    assert items[0].quantity == 2

    from app.services.cart_service import get_cart
    remaining = await get_cart(buyer.id)
    assert remaining == []
