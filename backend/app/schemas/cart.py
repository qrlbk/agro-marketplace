from pydantic import BaseModel, Field


class CartItemIn(BaseModel):
    product_id: int
    quantity: int = Field(1, gt=0, le=999)


class CartItemOut(BaseModel):
    product_id: int
    quantity: int
    vendor_id: int
    price: float
    name: str
    article_number: str
