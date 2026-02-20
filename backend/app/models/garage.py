from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Garage(Base):
    __tablename__ = "garages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    machine_id: Mapped[int] = mapped_column(ForeignKey("machines.id"), nullable=False, index=True)
    serial_number: Mapped[str | None] = mapped_column(String(128), nullable=True)
    moto_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)
