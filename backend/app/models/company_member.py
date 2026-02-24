import enum
from sqlalchemy import String, Enum, DateTime, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database import Base


class CompanyRole(str, enum.Enum):
    owner = "owner"
    manager = "manager"
    warehouse = "warehouse"
    sales = "sales"


class CompanyMember(Base):
    """Role of a user within a vendor company. Only for users with role=vendor and company_id set."""
    __tablename__ = "company_members"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    company_role: Mapped[CompanyRole] = mapped_column(
        Enum(CompanyRole, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    invited_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], back_populates="company_membership")
    company: Mapped["Company"] = relationship("Company", back_populates="members")
    invited_by: Mapped["User | None"] = relationship("User", foreign_keys=[invited_by_id])
