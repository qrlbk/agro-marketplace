"""Chat feedback table (thumbs up/down for assistant replies)

Revision ID: 013_chat
Revises: 012
Create Date: 2025-02-25

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision: str = "013_chat"
down_revision: Union[str, None] = "012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    r = conn.execute(text("SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_feedback'"))
    if r.fetchone() is not None:
        return  # already applied (e.g. when revision was duplicate 013)
    op.create_table(
        "chat_feedback",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("message_id", sa.String(64), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("is_positive", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_chat_feedback_message_id", "chat_feedback", ["message_id"], unique=False)
    op.create_index("ix_chat_feedback_user_id", "chat_feedback", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_chat_feedback_user_id", table_name="chat_feedback")
    op.drop_index("ix_chat_feedback_message_id", table_name="chat_feedback")
    op.drop_table("chat_feedback")
