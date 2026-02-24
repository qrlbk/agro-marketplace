import pytest


@pytest.mark.unit
@pytest.mark.asyncio
async def test_admin_dashboard_requires_auth(client):
    """GET /admin/dashboard without token returns 401."""
    response = await client.get("/admin/dashboard")
    assert response.status_code == 401
