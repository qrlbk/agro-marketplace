"""Add staff_id to audit_logs if missing (backfill for DBs that skipped 014).

Revision ID: 020
Revises: 019
Create Date: 2025-02-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


revision: str = "020"
down_revision: Union[str, None] = "019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    r = conn.execute(
        text("""
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'staff_id'
        """)
    )
    if r.fetchone() is not None:
        return
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
