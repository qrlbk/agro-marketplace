import enum
from sqlalchemy import String, Enum, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database import Base


class CompanyStatus(str, enum.Enum):
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    bin: Mapped[str] = mapped_column(String(12), unique=True, nullable=False, index=True)
    name: Mapped[str | None] = mapped_column(String(512), nullable=True)
    legal_address: Mapped[str | None] = mapped_column(String(512), nullable=True)
    chairman_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bank_iik: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bank_bik: Mapped[str | None] = mapped_column(String(50), nullable=True)
    region: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[CompanyStatus] = mapped_column(
        Enum(CompanyStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=CompanyStatus.APPROVED,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    users: Mapped[list["User"]] = relationship("User", back_populates="company")
    members: Mapped[list["CompanyMember"]] = relationship("CompanyMember", back_populates="company")
