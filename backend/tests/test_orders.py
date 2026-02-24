"""Orders API: list (farmer/vendor), get by id, update status; permission checks."""
import pytest
from decimal import Decimal
from app.models.user import User, UserRole
from app.models.product import Product, ProductStatus
from app.models.order import Order, OrderStatus, OrderItem
from app.services.cart_service import set_cart, clear_cart


@pytest.mark.integration
@pytest.mark.asyncio
async def test_orders_list_requires_auth(client_with_db):
    """GET /orders without token returns 401."""
    response = await client_with_db.get("/orders")
    assert response.status_code == 401


@pytest.mark.integration
@pytest.mark.asyncio
async def test_orders_list_farmer_sees_only_own(client_with_db, db_session, make_token):
    """GET /orders as farmer returns only that user's orders."""
    farmer = User(role=UserRole.farmer, phone="+77001130001", name="Farmer")
    other = User(role=UserRole.farmer, phone="+77001130002", name="Other")
    vendor = User(role=UserRole.vendor, phone="+77001130003", name="Vendor")
    db_session.add(farmer)
    db_session.add(other)
    db_session.add(vendor)
    await db_session.flush()
    order_farmer = Order(
        user_id=farmer.id, vendor_id=vendor.id, total_amount=Decimal("100"),
        status=OrderStatus.new, delivery_address="A", comment=None,
    )
    order_other = Order(
        user_id=other.id, vendor_id=vendor.id, total_amount=Decimal("200"),
        status=OrderStatus.new, delivery_address="B", comment=None,
    )
    db_session.add(order_farmer)
    db_session.add(order_other)
    await db_session.flush()

    token = make_token(farmer.id, farmer.role, farmer.phone)
    response = await client_with_db.get("/orders", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["user_id"] == farmer.id
    assert data[0]["total_amount"] == 100


@pytest.mark.integration
@pytest.mark.asyncio
async def test_orders_get_by_id_as_buyer(client_with_db, db_session, make_token):
    """GET /orders/{id} as buyer returns 200 and order."""
    buyer = User(role=UserRole.farmer, phone="+77001130004", name="Buyer")
    vendor = User(role=UserRole.vendor, phone="+77001130005", name="Vendor")
    db_session.add(buyer)
    db_session.add(vendor)
    await db_session.flush()
    order = Order(
        user_id=buyer.id, vendor_id=vendor.id, total_amount=Decimal("50"),
        status=OrderStatus.new, delivery_address="Addr", comment=None,
    )
    db_session.add(order)
    await db_session.flush()

    token = make_token(buyer.id, buyer.role, buyer.phone)
    response = await client_with_db.get(
        f"/orders/{order.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["id"] == order.id
    assert response.json()["user_id"] == buyer.id


@pytest.mark.integration
@pytest.mark.asyncio
async def test_orders_get_by_id_forbidden_for_other_user(client_with_db, db_session, make_token):
    """GET /orders/{id} as another buyer returns 403."""
    buyer = User(role=UserRole.farmer, phone="+77001130006", name="Buyer")
    other = User(role=UserRole.farmer, phone="+77001130007", name="Other")
    vendor = User(role=UserRole.vendor, phone="+77001130008", name="Vendor")
    db_session.add(buyer)
    db_session.add(other)
    db_session.add(vendor)
    await db_session.flush()
    order = Order(
        user_id=buyer.id, vendor_id=vendor.id, total_amount=Decimal("50"),
        status=OrderStatus.new, delivery_address="Addr", comment=None,
    )
    db_session.add(order)
    await db_session.flush()

    token = make_token(other.id, other.role, other.phone)
    response = await client_with_db.get(
        f"/orders/{order.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


@pytest.mark.integration
@pytest.mark.asyncio
async def test_orders_get_by_id_not_found(client_with_db, db_session, make_token):
    """GET /orders/{id} with non-existent id returns 404."""
    user = User(role=UserRole.farmer, phone="+77001130009", name="User")
    db_session.add(user)
    await db_session.flush()
    token = make_token(user.id, user.role, user.phone)
    response = await client_with_db.get(
        "/orders/999999",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404


@pytest.mark.integration
@pytest.mark.asyncio
async def test_orders_update_status_as_vendor(client_with_db, db_session, make_token):
    """PATCH /orders/{id}/status as order vendor returns 200 and updates status."""
    buyer = User(role=UserRole.farmer, phone="+77001130010", name="Buyer")
    vendor = User(role=UserRole.vendor, phone="+77001130011", name="Vendor")
    db_session.add(buyer)
    db_session.add(vendor)
    await db_session.flush()
    order = Order(
        user_id=buyer.id, vendor_id=vendor.id, total_amount=Decimal("75"),
        status=OrderStatus.new, delivery_address="Addr", comment=None,
    )
    db_session.add(order)
    await db_session.flush()

    token = make_token(vendor.id, vendor.role, vendor.phone)
    response = await client_with_db.patch(
        f"/orders/{order.id}/status",
        json={"status": OrderStatus.paid.value},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == OrderStatus.paid.value
    await db_session.refresh(order)
    assert order.status == OrderStatus.paid


@pytest.mark.integration
@pytest.mark.asyncio
async def test_orders_update_status_as_farmer_forbidden(client_with_db, db_session, make_token):
    """PATCH /orders/{id}/status as farmer returns 403."""
    buyer = User(role=UserRole.farmer, phone="+77001130012", name="Buyer")
    vendor = User(role=UserRole.vendor, phone="+77001130013", name="Vendor")
    db_session.add(buyer)
    db_session.add(vendor)
    await db_session.flush()
    order = Order(
        user_id=buyer.id, vendor_id=vendor.id, total_amount=Decimal("75"),
        status=OrderStatus.new, delivery_address="Addr", comment=None,
    )
    db_session.add(order)
    await db_session.flush()

    token = make_token(buyer.id, buyer.role, buyer.phone)
    response = await client_with_db.patch(
        f"/orders/{order.id}/status",
        json={"status": OrderStatus.paid.value},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
