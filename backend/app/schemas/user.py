from pydantic import BaseModel
from app.models.user import UserRole


class UserOut(BaseModel):
    id: int
    role: UserRole
    phone: str
    name: str | None
    company_details: dict | None

    class Config:
        from_attributes = True
