"""Cart API: GET, POST, DELETE with auth; 404 for unknown product."""
import pytest
from sqlalchemy import select

from app.models.user import User, UserRole
from app.models.product import Product, ProductStatus
from app.services.cart_service import get_cart, set_cart, clear_cart


@pytest.mark.integration
@pytest.mark.asyncio
async def test_cart_get_requires_auth(client_with_db):
    """GET /cart without token returns 401."""
    response = await client_with_db.get("/cart")
    assert response.status_code == 401


@pytest.mark.integration
@pytest.mark.asyncio
async def test_cart_get_empty_returns_empty_list(client_with_db, db_session, make_token):
    """GET /cart with auth and empty cart returns []."""
    user = User(role=UserRole.farmer, phone="+77001120001", name="Cart User")
    db_session.add(user)
    await db_session.flush()
    token = make_token(user.id, user.role, user.phone)
    response = await client_with_db.get("/cart", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.integration
@pytest.mark.asyncio
async def test_cart_add_then_get(client_with_db, db_session, make_token):
    """POST /cart/items then GET /cart returns the item."""
    user = User(role=UserRole.farmer, phone="+77001120002", name="Buyer")
    vendor = User(role=UserRole.vendor, phone="+77001120003", name="Vendor")
    db_session.add(user)
    db_session.add(vendor)
    await db_session.flush()
    product = Product(
        vendor_id=vendor.id,
        category_id=None,
        name="Cart Product",
        article_number="ART-CART-001",
        price=99.0,
        stock_quantity=5,
        status=ProductStatus.in_stock,
    )
    db_session.add(product)
    await db_session.flush()

    token = make_token(user.id, user.role, user.phone)
    add_resp = await client_with_db.post(
        "/cart/items",
        json={"product_id": product.id, "quantity": 2},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert add_resp.status_code == 200
    assert add_resp.json() == {"message": "Added"}

    get_resp = await client_with_db.get("/cart", headers={"Authorization": f"Bearer {token}"})
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert len(data) == 1
    assert data[0]["product_id"] == product.id
    assert data[0]["quantity"] == 2
    assert data[0]["vendor_id"] == vendor.id
    assert data[0]["price"] == 99.0
    assert data[0]["name"] == "Cart Product"

    await clear_cart(user.id)


@pytest.mark.integration
@pytest.mark.asyncio
async def test_cart_add_nonexistent_product_returns_404(client_with_db, db_session, make_token):
    """POST /cart/items with non-existent product_id returns 404."""
    user = User(role=UserRole.farmer, phone="+77001120004", name="Buyer")
    db_session.add(user)
    await db_session.flush()
    token = make_token(user.id, user.role, user.phone)
    response = await client_with_db.post(
        "/cart/items",
        json={"product_id": 999999, "quantity": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404
    assert "not found" in (response.json().get("detail") or "").lower()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_cart_delete_item(client_with_db, db_session, make_token):
    """DELETE /cart/items/{product_id} removes item; GET returns empty or remaining items."""
    user = User(role=UserRole.farmer, phone="+77001120005", name="Buyer")
    vendor = User(role=UserRole.vendor, phone="+77001120006", name="Vendor")
    db_session.add(user)
    db_session.add(vendor)
    await db_session.flush()
    product = Product(
        vendor_id=vendor.id,
        category_id=None,
        name="To Remove",
        article_number="ART-RM-001",
        price=10.0,
        stock_quantity=1,
        status=ProductStatus.in_stock,
    )
    db_session.add(product)
    await db_session.flush()

    await set_cart(user.id, [{"product_id": product.id, "quantity": 1, "vendor_id": vendor.id}])
    token = make_token(user.id, user.role, user.phone)

    del_resp = await client_with_db.delete(
        f"/cart/items/{product.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_resp.status_code == 204

    get_resp = await client_with_db.get("/cart", headers={"Authorization": f"Bearer {token}"})
    assert get_resp.status_code == 200
    assert get_resp.json() == []

    await clear_cart(user.id)
