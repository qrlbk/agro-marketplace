from pydantic import BaseModel


class StaffLoginIn(BaseModel):
    login: str
    password: str
    otp_code: str | None = None


class StaffRoleOut(BaseModel):
    id: int
    name: str
    slug: str

    class Config:
        from_attributes = True


class StaffMeOut(BaseModel):
    id: int
    login: str
    name: str | None
    role: StaffRoleOut
    permissions: list[str]
    is_active: bool

    class Config:
        from_attributes = True


class StaffChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


# --- Employees CRUD ---

class StaffEmployeeOut(BaseModel):
    id: int
    login: str
    name: str | None
    role_id: int
    role_name: str
    role_slug: str
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True


class StaffEmployeeCreate(BaseModel):
    login: str
    name: str | None = None
    role_id: int
    password: str
    is_active: bool = True


class StaffEmployeeUpdate(BaseModel):
    name: str | None = None
    role_id: int | None = None
    is_active: bool | None = None
    new_password: str | None = None


# --- Roles CRUD ---

class PermissionOut(BaseModel):
    id: int
    code: str
    name: str

    class Config:
        from_attributes = True


class RoleOut(BaseModel):
    id: int
    name: str
    slug: str
    is_system: bool
    permission_codes: list[str]

    class Config:
        from_attributes = True


class RoleCreate(BaseModel):
    name: str
    slug: str
    permission_ids: list[int] = []


class RoleUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    permission_ids: list[int] | None = None
