"""Add order_number to orders

Revision ID: 009
Revises: 008
Create Date: 2025-02-24

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("order_number", sa.String(32), nullable=True))
    conn = op.get_bind()
    conn.execute(text("""
        UPDATE orders SET order_number = 'ORD-' || EXTRACT(YEAR FROM created_at)::int::text || '-' || LPAD(id::text, 6, '0')
        WHERE order_number IS NULL
    """))
    op.create_index("ix_orders_order_number", "orders", ["order_number"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_orders_order_number", table_name="orders")
    op.drop_column("orders", "order_number")
