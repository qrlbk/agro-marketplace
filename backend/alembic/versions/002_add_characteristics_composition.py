"""Add characteristics and composition to products

Revision ID: 002
Revises: 001
Create Date: 2025-02-19

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("products", sa.Column("characteristics", postgresql.JSONB(), nullable=True))
    op.add_column("products", sa.Column("composition", sa.String(2048), nullable=True))


def downgrade() -> None:
    op.drop_column("products", "composition")
    op.drop_column("products", "characteristics")
