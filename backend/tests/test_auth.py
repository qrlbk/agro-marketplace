"""Auth: demo login, /me with token, invalid JWT -> 401."""
import pytest


@pytest.mark.unit
@pytest.mark.asyncio
async def test_protected_endpoint_invalid_jwt_returns_401(client):
    """Any protected endpoint with invalid JWT returns 401."""
    response = await client.get(
        "/cart",
        headers={"Authorization": "Bearer invalid-token"},
    )
    assert response.status_code == 401


@pytest.mark.unit
@pytest.mark.asyncio
async def test_protected_endpoint_expired_jwt_returns_401(client, make_token):
    """Endpoint with expired JWT returns 401 (get_current_user loads from DB and may fail)."""
    from datetime import datetime, timedelta
    from jose import jwt
    from app.config import settings
    expire = datetime.utcnow() - timedelta(minutes=5)
    payload = {"sub": "1", "role": "farmer", "phone": "+77000000001", "exp": expire}
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    response = await client.get("/cart", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


@pytest.mark.integration
@pytest.mark.asyncio
async def test_demo_login_success_returns_token(client_with_db, db_session):
    """POST /auth/demo-login with valid demo credentials returns access_token."""
    response = await client_with_db.post(
        "/auth/demo-login",
        json={"phone": "+77001112233", "password": "admin"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert isinstance(data["access_token"], str)
    assert len(data["access_token"]) > 0


@pytest.mark.integration
@pytest.mark.asyncio
async def test_demo_login_wrong_password_returns_400(client_with_db):
    """POST /auth/demo-login with wrong password returns 400."""
    response = await client_with_db.post(
        "/auth/demo-login",
        json={"phone": "+77001112233", "password": "wrong"},
    )
    assert response.status_code == 400
    assert "пароль" in response.json().get("detail", "").lower() or "password" in response.json().get("detail", "").lower()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_auth_me_with_valid_token(client_with_db, db_session, make_token):
    """GET /auth/me with valid JWT returns user info."""
    from app.models.user import User, UserRole
    user = User(role=UserRole.farmer, phone="+77001140001", name="Me User")
    db_session.add(user)
    await db_session.flush()
    token = make_token(user.id, user.role, user.phone)
    response = await client_with_db.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user.id
    assert data["phone"] == user.phone
    assert data["role"] == user.role.value
    assert data["name"] == user.name
