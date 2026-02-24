"""Products: list (optional auth), get by id (200/404)."""
import pytest
from sqlalchemy import select

from app.models.user import User, UserRole
from app.models.product import Product, ProductStatus


@pytest.mark.integration
@pytest.mark.asyncio
async def test_products_list_returns_200(client_with_db, db_session):
    """GET /products without auth returns 200 and list (may be empty)."""
    response = await client_with_db.get("/products")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)


@pytest.mark.integration
@pytest.mark.asyncio
async def test_products_get_by_id_success(client_with_db, db_session):
    """GET /products/{id} with existing product returns 200."""
    vendor = User(role=UserRole.vendor, phone="+77001160001", name="Vendor")
    db_session.add(vendor)
    await db_session.flush()
    product = Product(
        vendor_id=vendor.id,
        category_id=None,
        name="Test Product",
        article_number="ART-P-001",
        price=100.0,
        stock_quantity=5,
        status=ProductStatus.in_stock,
    )
    db_session.add(product)
    await db_session.flush()

    response = await client_with_db.get(f"/products/{product.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == product.id
    assert data["name"] == product.name
    assert data["article_number"] == product.article_number
    assert data["price"] == 100.0


@pytest.mark.integration
@pytest.mark.asyncio
async def test_products_get_by_id_not_found(client_with_db):
    """GET /products/{id} with non-existent id returns 404."""
    response = await client_with_db.get("/products/999999")
    assert response.status_code == 404
