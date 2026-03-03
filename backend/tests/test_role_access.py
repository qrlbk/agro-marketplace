"""API tests for role-based access. See docs/ROLE_MODEL.md section 9 for full test matrix."""
import pytest
from app.models.user import User, UserRole
from app.models.company import Company, CompanyStatus
from app.models.company_member import CompanyMember, CompanyRole


@pytest.mark.integration
@pytest.mark.asyncio
async def test_admin_dashboard_rejects_non_admin_marketplace_token(client_with_db, db_session, make_token):
    """GET /admin/dashboard with marketplace token (role=user) returns 401: user is not admin, token is not staff."""
    user = User(role=UserRole.user, phone="+77001150001", name="Plain User")
    db_session.add(user)
    await db_session.flush()
    token = make_token(user.id, user.role, user.phone)
    response = await client_with_db.get(
        "/admin/dashboard",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401


@pytest.mark.integration
@pytest.mark.asyncio
async def test_garage_forbidden_for_user_role(client_with_db, db_session, make_token):
    """GET /garage/machines with role=user returns 403 (farmer or admin only)."""
    user = User(role=UserRole.user, phone="+77001150002", name="Plain User")
    db_session.add(user)
    await db_session.flush()
    token = make_token(user.id, user.role, user.phone)
    response = await client_with_db.get(
        "/garage/machines",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_product_forbidden_for_user_role(client_with_db, db_session, make_token):
    """POST /products with role=user returns 403 (vendor or admin only)."""
    user = User(role=UserRole.user, phone="+77001150004", name="Plain User")
    db_session.add(user)
    await db_session.flush()
    token = make_token(user.id, user.role, user.phone)
    response = await client_with_db.post(
        "/products",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Test Product",
            "category_id": None,
            "price": 100,
            "stock_quantity": 1,
            "status": "draft",
        },
    )
    assert response.status_code == 403


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_category_forbidden_for_vendor(client_with_db, db_session, make_token):
    """POST /categories with role=vendor returns 403 (admin only)."""
    user = User(role=UserRole.vendor, phone="+77001150005", name="Vendor")
    db_session.add(user)
    await db_session.flush()
    token = make_token(user.id, user.role, user.phone)
    response = await client_with_db.post(
        "/categories",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "New Cat", "slug": "new-cat", "parent_id": None},
    )
    assert response.status_code == 403


@pytest.mark.integration
@pytest.mark.asyncio
async def test_vendor_team_invite_forbidden_for_non_owner(client_with_db, db_session, make_token):
    """POST /vendor/team/invite with vendor that is not company owner returns 403."""
    company = Company(
        name="Test Co",
        bin="123456789012",
        status=CompanyStatus.APPROVED,
        region="Almaty",
    )
    db_session.add(company)
    await db_session.flush()
    owner = User(role=UserRole.vendor, phone="+77001150006", company_id=company.id, name="Owner")
    member = User(role=UserRole.vendor, phone="+77001150007", company_id=company.id, name="Sales")
    db_session.add(owner)
    db_session.add(member)
    await db_session.flush()
    db_session.add(CompanyMember(user_id=owner.id, company_id=company.id, company_role=CompanyRole.owner))
    db_session.add(CompanyMember(user_id=member.id, company_id=company.id, company_role=CompanyRole.sales))
    await db_session.flush()

    token = make_token(member.id, member.role, member.phone)
    response = await client_with_db.post(
        "/vendor/team/invite",
        headers={"Authorization": f"Bearer {token}"},
        json={"phone": "+77001150099", "company_role": "sales"},
    )
    assert response.status_code == 403
