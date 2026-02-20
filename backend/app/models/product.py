import enum
from sqlalchemy import String, Numeric, Integer, ForeignKey, DateTime, Enum
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database import Base


class ProductStatus(str, enum.Enum):
    in_stock = "In_Stock"
    on_order = "On_Order"


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    # Global uniqueness: one article_number per system. For per-vendor uniqueness use (vendor_id, article_number).
    article_number: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    description: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    characteristics: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    composition: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    images: Mapped[list | None] = mapped_column(ARRAY(String), nullable=True)
    status: Mapped[ProductStatus] = mapped_column(
        Enum(ProductStatus, values_callable=lambda x: [e.value for e in x]),
        default=ProductStatus.in_stock,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
