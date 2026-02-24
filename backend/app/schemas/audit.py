from datetime import datetime
from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: int
    user_id: int | None
    user_phone: str | None
    user_name: str | None
    company_id: int | None
    action: str
    entity_type: str | None
    entity_id: int | None
    details: dict | None
    created_at: datetime

    class Config:
        from_attributes = True
