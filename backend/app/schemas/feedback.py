from pydantic import BaseModel
from datetime import datetime
from app.models.feedback import FeedbackStatus, FeedbackPriority, FeedbackCategory


class FeedbackCreate(BaseModel):
    subject: str
    message: str
    contact_phone: str | None = None
    order_id: int | None = None
    product_id: int | None = None


class FeedbackOut(BaseModel):
    id: int
    message: str = "Спасибо, мы ответим в уведомлениях (и по телефону, если указан)."

    class Config:
        from_attributes = True


class FeedbackMessageOut(BaseModel):
    id: int
    ticket_id: int
    sender_type: str
    sender_user_id: int | None = None
    sender_staff_id: int | None = None
    message: str
    created_at: datetime

    class Config:
        from_attributes = True


class FeedbackTicketAdminOut(BaseModel):
    id: int
    user_id: int | None
    user_phone: str | None = None
    user_name: str | None = None
    subject: str
    message: str
    contact_phone: str | None
    status: FeedbackStatus
    priority: str = FeedbackPriority.normal.value
    category: str | None = None
    assigned_to_id: int | None = None
    assigned_to_name: str | None = None
    admin_notes: str | None
    order_id: int | None = None
    order_number: str | None = None
    product_id: int | None = None
    product_name: str | None = None
    created_at: datetime
    updated_at: datetime
    messages: list[FeedbackMessageOut] = []
    overdue: bool = False

    class Config:
        from_attributes = True


class FeedbackTicketUpdate(BaseModel):
    status: FeedbackStatus | None = None
    priority: str | None = None
    category: str | None = None
    assigned_to_id: int | None = None
    admin_notes: str | None = None
    send_reply: str | None = None


class ReplyTemplateOut(BaseModel):
    id: int
    name: str
    body: str

    class Config:
        from_attributes = True


class ReplyTemplateCreate(BaseModel):
    name: str
    body: str
