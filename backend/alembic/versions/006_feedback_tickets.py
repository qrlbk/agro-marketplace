"""Feedback tickets table

Revision ID: 006
Revises: 005
Create Date: 2025-02-20

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "feedback_tickets",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("subject", sa.String(255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("contact_phone", sa.String(20), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("admin_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_feedback_tickets_user_id", "feedback_tickets", ["user_id"], unique=False)
    op.create_index("ix_feedback_tickets_status", "feedback_tickets", ["status"], unique=False)
    op.create_index("ix_feedback_tickets_created_at", "feedback_tickets", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_feedback_tickets_created_at", table_name="feedback_tickets")
    op.drop_index("ix_feedback_tickets_status", table_name="feedback_tickets")
    op.drop_index("ix_feedback_tickets_user_id", table_name="feedback_tickets")
    op.drop_table("feedback_tickets")
