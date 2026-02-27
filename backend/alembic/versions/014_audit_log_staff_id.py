"""Add staff_id to audit_logs for staff actor

Revision ID: 014
Revises: 013
Create Date: 2025-02-25

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "014"
down_revision: Union[str, None] = "013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "audit_logs",
        sa.Column("staff_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_audit_logs_staff_id",
        "audit_logs",
        "staff",
        ["staff_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_audit_logs_staff_id", "audit_logs", ["staff_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_audit_logs_staff_id", table_name="audit_logs")
    op.drop_constraint("fk_audit_logs_staff_id", "audit_logs", type_="foreignkey")
    op.drop_column("audit_logs", "staff_id")
