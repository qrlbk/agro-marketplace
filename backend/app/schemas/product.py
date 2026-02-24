from pydantic import BaseModel, Field
from decimal import Decimal
from app.models.product import ProductStatus


class ProductOut(BaseModel):
    id: int
    vendor_id: int
    category_id: int | None
    category_slug: str | None = None
    name: str
    article_number: str
    price: Decimal
    stock_quantity: int
    description: str | None
    characteristics: dict | None = None
    composition: str | None = None
    images: list[str] | None
    status: ProductStatus
    average_rating: float | None = None
    reviews_count: int = 0

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    category_id: int | None = None
    name: str
    article_number: str | None = None
    price: float = Field(..., ge=0)
    stock_quantity: int = Field(0, ge=0)
    description: str | None = None
    characteristics: dict | None = None
    composition: str | None = None
    images: list[str] | None = None
    status: ProductStatus = ProductStatus.in_stock


class ProductUpdate(BaseModel):
    category_id: int | None = None
    name: str | None = None
    article_number: str | None = None
    price: float | None = Field(None, ge=0)
    stock_quantity: int | None = Field(None, ge=0)
    description: str | None = None
    characteristics: dict | None = None
    composition: str | None = None
    images: list[str] | None = None
    status: ProductStatus | None = None


class ProductListOut(BaseModel):
    items: list[ProductOut]
    total: int
    suggested_terms: list[str] | None = None


class AddCompatibilityIn(BaseModel):
    machine_id: int


class CheckCompatibilityIn(BaseModel):
    product_id: int
    machine_id: int
