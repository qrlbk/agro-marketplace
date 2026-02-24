from datetime import datetime
from pydantic import BaseModel
from app.models.company_member import CompanyRole


class TeamMemberOut(BaseModel):
    user_id: int
    phone: str
    name: str | None
    company_role: CompanyRole
    invited_by_id: int | None
    created_at: datetime


class TeamInviteIn(BaseModel):
    phone: str
    company_role: CompanyRole


class TeamRoleUpdate(BaseModel):
    company_role: CompanyRole
