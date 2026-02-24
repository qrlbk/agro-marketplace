"""Admin: dashboard with farmer token 403, with admin token 200."""
import pytest


@pytest.mark.integration
@pytest.mark.asyncio
async def test_admin_dashboard_with_farmer_token_returns_403(client_with_db, db_session, make_token):
    """GET /admin/dashboard with farmer JWT returns 403."""
    from app.models.user import User, UserRole
    farmer = User(role=UserRole.farmer, phone="+77001150001", name="Farmer")
    db_session.add(farmer)
    await db_session.flush()
    token = make_token(farmer.id, farmer.role, farmer.phone)
    response = await client_with_db.get(
        "/admin/dashboard",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


@pytest.mark.integration
@pytest.mark.asyncio
async def test_admin_dashboard_with_admin_token_returns_200(client_with_db, db_session, make_token):
    """GET /admin/dashboard with admin JWT returns 200."""
    from app.models.user import User, UserRole
    admin = User(role=UserRole.admin, phone="+77001150002", name="Admin")
    db_session.add(admin)
    await db_session.flush()
    token = make_token(admin.id, admin.role, admin.phone)
    response = await client_with_db.get(
        "/admin/dashboard",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
