import enum
from sqlalchemy import String, Enum, DateTime, Integer, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database import Base


class UserRole(str, enum.Enum):
    guest = "guest"
    user = "user"
    farmer = "farmer"
    vendor = "vendor"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, default=UserRole.guest)
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    region: Mapped[str | None] = mapped_column(String(255), nullable=True)
    company_details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    company_id: Mapped[int | None] = mapped_column(ForeignKey("companies.id"), nullable=True, index=True)
    chat_storage_opt_in: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    company: Mapped["Company | None"] = relationship("Company", back_populates="users")
    company_membership: Mapped["CompanyMember | None"] = relationship(
        "CompanyMember", back_populates="user", foreign_keys="CompanyMember.user_id", uselist=False
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="user")
