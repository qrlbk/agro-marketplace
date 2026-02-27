"""End-to-end registration flows: OTP -> guest -> onboarding -> final role."""

import pytest
from sqlalchemy import select


@pytest.mark.integration
@pytest.mark.asyncio
async def test_registration_flow_user_via_otp_and_onboarding(client_with_db, db_session, monkeypatch):
    """New phone: OTP login creates guest, onboarding promotes to user."""
    from app.routers import auth as auth_router
    from app.models.user import User, UserRole

    phone = "+77001160001"

    # Make OTP deterministic and avoid real SMS sending
    monkeypatch.setattr(auth_router, "_generate_otp_code", lambda: "123456")

    async def fake_send_sms(_phone: str, _text: str) -> None:  # pragma: no cover - behavior is trivial
        return None

    monkeypatch.setattr(auth_router.sms_gateway, "send", fake_send_sms)

    # 1) Request OTP
    resp = await client_with_db.post("/auth/request-otp", json={"phone": phone})
    assert resp.status_code == 200

    # 2) Verify OTP -> JWT issued and guest user created
    resp = await client_with_db.post("/auth/verify-otp", json={"phone": phone, "code": "123456"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    token = data["access_token"]
    assert isinstance(token, str) and token

    # DB: user exists and is guest
    result = await db_session.execute(select(User).where(User.phone == phone))
    user = result.scalar_one()
    assert user.role == UserRole.guest

    # 3) Onboarding as regular user
    onboarding_body = {
        "role": "user",
        "name": "Test Buyer",
        "region": "Алматинская область",
    }
    resp = await client_with_db.post(
        "/auth/onboarding",
        json=onboarding_body,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["role"] == "user"
    assert body["name"] == "Test Buyer"
    assert body["region"] == "Алматинская область"
    assert body["company_id"] is None

    # 4) /auth/me now returns non-guest role
    resp = await client_with_db.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    me = resp.json()
    assert me["role"] == "user"
    assert me["name"] == "Test Buyer"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_registration_flow_vendor_via_otp_and_onboarding(client_with_db, db_session, monkeypatch):
    """New phone: OTP login creates guest, onboarding as vendor creates company and owner membership."""
    from app.routers import auth as auth_router
    from app.models.user import User, UserRole
    from app.models.company import Company, CompanyStatus

    phone = "+77001160002"

    monkeypatch.setattr(auth_router, "_generate_otp_code", lambda: "654321")

    async def fake_send_sms(_phone: str, _text: str) -> None:  # pragma: no cover - behavior is trivial
        return None

    monkeypatch.setattr(auth_router.sms_gateway, "send", fake_send_sms)

    # 1) Request OTP
    resp = await client_with_db.post("/auth/request-otp", json={"phone": phone})
    assert resp.status_code == 200

    # 2) Verify OTP
    resp = await client_with_db.post("/auth/verify-otp", json={"phone": phone, "code": "654321"})
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    assert token

    # DB: guest user created
    result = await db_session.execute(select(User).where(User.phone == phone))
    user = result.scalar_one()
    assert user.role == UserRole.guest
    assert user.company_id is None

    # 3) Onboarding as vendor
    onboarding_body = {
        "role": "vendor",
        "name": "Vendor Owner",
        "region": "Алматинская область",
        "bin": "123456789012",
        "company_name": "Vendor LLC",
        "legal_address": "Almaty, Kazakhstan",
        "contact_name": "Owner Name",
        "bank_iik": "KZ1234567890",
        "bank_bik": "ABCDKZKX",
    }
    resp = await client_with_db.post(
        "/auth/onboarding",
        json=onboarding_body,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["role"] == "vendor"
    assert data["company_id"] is not None
    assert data["company_status"] == CompanyStatus.PENDING_APPROVAL.value
    assert data["company_role"] == "owner"

    # Company record exists with given BIN
    result = await db_session.execute(select(Company).where(Company.bin == onboarding_body["bin"]))
    company = result.scalar_one()
    assert company.status == CompanyStatus.PENDING_APPROVAL

