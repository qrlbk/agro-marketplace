from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
from app.models.order import OrderStatus


class OrderItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    price_at_order: Decimal
    name: str | None = None
    article_number: str | None = None

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: int
    order_number: str | None = None
    user_id: int
    vendor_id: int
    total_amount: Decimal
    status: OrderStatus
    delivery_address: str | None
    comment: str | None
    created_at: datetime
    items: list[OrderItemOut] = []

    class Config:
        from_attributes = True


class AdminOrderOut(OrderOut):
    user_phone: str | None = None
    vendor_phone: str | None = None


class CheckoutIn(BaseModel):
    delivery_address: str | None = None
    comment: str | None = None


class CheckoutOut(BaseModel):
    order_ids: list[int]
    message: str
