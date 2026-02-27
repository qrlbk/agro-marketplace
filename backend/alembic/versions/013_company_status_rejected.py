"""Add REJECTED to CompanyStatus enum

Revision ID: 013
Revises: 012
Create Date: 2025-02-25

"""
from typing import Sequence, Union
from alembic import op

revision: str = "013"
down_revision: Union[str, None] = "012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE companystatus ADD VALUE IF NOT EXISTS 'rejected'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values easily; leave 'rejected' in place
    pass
