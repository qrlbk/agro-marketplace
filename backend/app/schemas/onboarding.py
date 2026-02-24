from pydantic import BaseModel, Field

from app.models.user import UserRole


class OnboardingIn(BaseModel):
    """Single body for onboarding. role required; other fields depend on role."""

    role: UserRole = Field(..., description="user | farmer | vendor")
    name: str | None = Field(None, max_length=255)
    region: str | None = Field(None, max_length=255)
    bin: str | None = Field(None, min_length=10, max_length=12)
    company_name: str | None = Field(None, max_length=512)
    legal_address: str | None = Field(None, max_length=512)
    chairman_name: str | None = Field(None, max_length=255)
    bank_iik: str | None = Field(None, max_length=50)
    bank_bik: str | None = Field(None, max_length=50)
    contact_name: str | None = Field(None, max_length=255)
