from pydantic import BaseModel, Field


class RequestOTPIn(BaseModel):
    phone: str = Field(..., min_length=10, max_length=20, pattern=r"^\+?[0-9\s\-]{10,20}$")


class VerifyOTPIn(BaseModel):
    phone: str = Field(..., min_length=10, max_length=20, pattern=r"^\+?[0-9\s\-]{10,20}$")
    code: str = Field(..., min_length=4, max_length=8)


class DemoLoginIn(BaseModel):
    phone: str = Field(..., min_length=10, max_length=20)
    password: str


class PasswordLoginIn(BaseModel):
    phone: str = Field(..., min_length=10, max_length=20)
    password: str


class SetPasswordIn(BaseModel):
    current_password: str | None = None
    new_password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
