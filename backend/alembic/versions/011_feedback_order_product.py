"""Add order_id and product_id to feedback_tickets

Revision ID: 011
Revises: 010
Create Date: 2025-02-24

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "011"
down_revision: Union[str, None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("feedback_tickets", sa.Column("order_id", sa.Integer(), nullable=True))
    op.add_column("feedback_tickets", sa.Column("product_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_feedback_tickets_order_id_orders",
        "feedback_tickets",
        "orders",
        ["order_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_feedback_tickets_product_id_products",
        "feedback_tickets",
        "products",
        ["product_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_feedback_tickets_order_id", "feedback_tickets", ["order_id"])
    op.create_index("ix_feedback_tickets_product_id", "feedback_tickets", ["product_id"])


def downgrade() -> None:
    op.drop_index("ix_feedback_tickets_product_id", table_name="feedback_tickets")
    op.drop_index("ix_feedback_tickets_order_id", table_name="feedback_tickets")
    op.drop_constraint("fk_feedback_tickets_product_id_products", "feedback_tickets", type_="foreignkey")
    op.drop_constraint("fk_feedback_tickets_order_id_orders", "feedback_tickets", type_="foreignkey")
    op.drop_column("feedback_tickets", "product_id")
    op.drop_column("feedback_tickets", "order_id")
