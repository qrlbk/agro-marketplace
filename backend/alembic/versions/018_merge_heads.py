"""Merge heads: master-audit (017) and chat (014_chat)

Revision ID: 018
Revises: 017, 014_chat
Create Date: 2025-02-25

"""
from typing import Sequence, Union
from alembic import op

revision: str = "018"
down_revision: Union[str, tuple[str, ...], None] = ("017", "014_chat")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
