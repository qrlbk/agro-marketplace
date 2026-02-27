"""Add chat privacy opt-in and company storage usage.

Revision ID: 019
Revises: 018
Create Date: 2025-02-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "019"
down_revision: Union[str, None] = "018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "chat_storage_opt_in",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "companies",
        sa.Column(
            "storage_used_mb",
            sa.Float(),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("companies", "storage_used_mb")
    op.drop_column("users", "chat_storage_opt_in")
