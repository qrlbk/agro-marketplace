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
async def test_demo_login_success_returns_token(client_with_db, db_session, monkeypatch):
    """POST /auth/demo-login with valid demo credentials returns access_token."""
    from app.config import settings
    monkeypatch.setattr(settings, "demo_auth_enabled", True)
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
async def test_demo_login_wrong_password_returns_400(client_with_db, monkeypatch):
    """POST /auth/demo-login with wrong password returns 400."""
    from app.config import settings
    monkeypatch.setattr(settings, "demo_auth_enabled", True)
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


@pytest.mark.unit
def test_generate_otp_code_returns_digits():
    from app.routers import auth as auth_router
    for _ in range(5):
        code = auth_router._generate_otp_code()
        assert len(code) == auth_router.OTP_LENGTH
        assert code.isdigit()


@pytest.mark.unit
def test_jwt_payload_never_contains_password_or_hash():
    """Security: marketplace and staff JWT payloads must not contain password or password_hash."""
    from jose import jwt
    from app.config import settings
    from app.routers.auth import create_access_token
    from app.routers.staff import _create_staff_token
    from app.models.user import UserRole

    token = create_access_token(1, UserRole.farmer, "+77001234567")
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    assert "password" not in payload
    assert "password_hash" not in payload

    staff_token = _create_staff_token(1, ["feedback.view"])
    staff_secret = settings.staff_jwt_secret or settings.jwt_secret
    staff_payload = jwt.decode(staff_token, staff_secret, algorithms=[settings.jwt_algorithm])
    assert "password" not in staff_payload
    assert "password_hash" not in staff_payload


@pytest.mark.integration
@pytest.mark.asyncio
async def test_login_password_success_returns_token(client_with_db, db_session):
  """POST /auth/login-password with valid credentials returns access_token."""
  from app.models.user import User, UserRole
  from app.routers import auth as auth_router

  password = "StrongPass123"
  user = User(
      role=UserRole.farmer,
      phone="+77001150001",
      name="Password User",
      password_hash=auth_router.pwd_ctx.hash(password),
  )
  db_session.add(user)
  await db_session.flush()

  response = await client_with_db.post(
      "/auth/login-password",
      json={"phone": user.phone, "password": password},
  )
  assert response.status_code == 200
  data = response.json()
  assert "access_token" in data
  assert isinstance(data["access_token"], str)
  assert len(data["access_token"]) > 0


@pytest.mark.integration
@pytest.mark.asyncio
async def test_set_password_sets_hash_when_not_present(client_with_db, db_session, make_token):
  """POST /auth/set-password sets password_hash when it was empty."""
  from app.models.user import User, UserRole
  from app.routers import auth as auth_router

  user = User(role=UserRole.farmer, phone="+77001150002", name="No Password User")
  db_session.add(user)
  await db_session.flush()

  token = make_token(user.id, user.role, user.phone)
  new_password = "NewStrongPass123"
  response = await client_with_db.post(
      "/auth/set-password",
      json={"new_password": new_password},
      headers={"Authorization": f"Bearer {token}"},
  )
  assert response.status_code == 200
  await db_session.refresh(user)
  assert user.password_hash is not None
  assert auth_router.pwd_ctx.verify(new_password, user.password_hash)
