from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class CompatibilityMatrix(Base):
    __tablename__ = "compatibility_matrix"
    __table_args__ = (UniqueConstraint("product_id", "machine_id", name="uq_compatibility_product_machine"),)

    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), primary_key=True)
    machine_id: Mapped[int] = mapped_column(ForeignKey("machines.id"), primary_key=True)
