"""Feedback messages table for ticket thread history

Revision ID: 015
Revises: 014
Create Date: 2025-02-25

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "015"
down_revision: Union[str, None] = "014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "feedback_messages",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("ticket_id", sa.Integer(), nullable=False),
        sa.Column("sender_type", sa.String(16), nullable=False),
        sa.Column("sender_user_id", sa.Integer(), nullable=True),
        sa.Column("sender_staff_id", sa.Integer(), nullable=True),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["ticket_id"], ["feedback_tickets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sender_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["sender_staff_id"], ["staff.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_feedback_messages_ticket_id", "feedback_messages", ["ticket_id"], unique=False)
    op.create_index("ix_feedback_messages_sender_type", "feedback_messages", ["sender_type"], unique=False)
    op.create_index("ix_feedback_messages_created_at", "feedback_messages", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_feedback_messages_created_at", table_name="feedback_messages")
    op.drop_index("ix_feedback_messages_sender_type", table_name="feedback_messages")
    op.drop_index("ix_feedback_messages_ticket_id", table_name="feedback_messages")
    op.drop_table("feedback_messages")
