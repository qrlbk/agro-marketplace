from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ReplyTemplate(Base):
    __tablename__ = "reply_templates"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
