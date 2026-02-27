import enum
from sqlalchemy import String, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database import Base


class FeedbackStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"


class FeedbackPriority(str, enum.Enum):
    low = "low"
    normal = "normal"
    high = "high"


class FeedbackCategory(str, enum.Enum):
    order = "order"
    delivery = "delivery"
    tech = "tech"


class FeedbackTicket(Base):
    __tablename__ = "feedback_tickets"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    contact_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[FeedbackStatus] = mapped_column(
        String(32), nullable=False, default=FeedbackStatus.open, index=True
    )
    priority: Mapped[str] = mapped_column(
        String(16), nullable=False, default=FeedbackPriority.normal.value, index=True
    )
    category: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    assigned_to_id: Mapped[int | None] = mapped_column(
        ForeignKey("staff.id", ondelete="SET NULL"), nullable=True, index=True
    )
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id"), nullable=True, index=True)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    messages: Mapped[list["FeedbackMessage"]] = relationship(
        "FeedbackMessage", back_populates="ticket", order_by="FeedbackMessage.created_at"
    )
    assigned_to: Mapped["Staff | None"] = relationship("Staff", foreign_keys=[assigned_to_id])


class FeedbackMessage(Base):
    """One message in a feedback ticket thread (reply from staff or follow-up from user)."""
    __tablename__ = "feedback_messages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("feedback_tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_type: Mapped[str] = mapped_column(String(16), nullable=False, index=True)  # "user" | "staff"
    sender_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    sender_staff_id: Mapped[int | None] = mapped_column(ForeignKey("staff.id", ondelete="SET NULL"), nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    ticket: Mapped["FeedbackTicket"] = relationship("FeedbackTicket", back_populates="messages")
