from pydantic import BaseModel, Field
from app.models.user import UserRole


class ProfileUpdateIn(BaseModel):
    """Optional fields for PATCH /auth/me (name, region)."""

    name: str | None = Field(None, max_length=255)
    region: str | None = Field(None, max_length=255)


class UserOut(BaseModel):
    id: int
    role: UserRole
    phone: str
    name: str | None
    region: str | None
    company_id: int | None
    company_details: dict | None
    company_status: str | None = None  # "pending_approval" | "approved" for vendor
    company_role: str | None = None  # "owner" | "manager" | "warehouse" | "sales" for vendor

    class Config:
        from_attributes = True
