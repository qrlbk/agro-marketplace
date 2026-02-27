"""Add priority, category, assigned_to to feedback_tickets

Revision ID: 016
Revises: 015
Create Date: 2025-02-25

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "016"
down_revision: Union[str, None] = "015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "feedback_tickets",
        sa.Column("priority", sa.String(16), nullable=False, server_default="normal"),
    )
    op.add_column(
        "feedback_tickets",
        sa.Column("category", sa.String(32), nullable=True),
    )
    op.add_column(
        "feedback_tickets",
        sa.Column("assigned_to_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_feedback_tickets_assigned_to_id",
        "feedback_tickets",
        "staff",
        ["assigned_to_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_feedback_tickets_priority", "feedback_tickets", ["priority"], unique=False)
    op.create_index("ix_feedback_tickets_category", "feedback_tickets", ["category"], unique=False)
    op.create_index("ix_feedback_tickets_assigned_to_id", "feedback_tickets", ["assigned_to_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_feedback_tickets_assigned_to_id", table_name="feedback_tickets")
    op.drop_index("ix_feedback_tickets_category", table_name="feedback_tickets")
    op.drop_index("ix_feedback_tickets_priority", table_name="feedback_tickets")
    op.drop_constraint("fk_feedback_tickets_assigned_to_id", "feedback_tickets", type_="foreignkey")
    op.drop_column("feedback_tickets", "assigned_to_id")
    op.drop_column("feedback_tickets", "category")
    op.drop_column("feedback_tickets", "priority")
