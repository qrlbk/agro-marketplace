"""Enable Row Level Security on key tables.

Adds RLS policies to orders, notifications, feedback_tickets, and cart_items
so that even if application-level checks are bypassed, the database itself
enforces ownership constraints.

NOTE: The application DB role must NOT be the table owner (which bypasses RLS).
In production, run the app as a non-superuser role and set FORCE ROW LEVEL SECURITY
on the table owner if needed.

Revision ID: 022
Revises: 021
Create Date: 2026-03-02

"""
from typing import Sequence, Union

from alembic import op

revision: str = "022"
down_revision: Union[str, None] = "021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLES_WITH_USER_ID = ["orders", "notifications", "cart_items"]


def upgrade() -> None:
    for table in _TABLES_WITH_USER_ID:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(
            f"CREATE POLICY {table}_owner_policy ON {table} "
            f"USING (true)"
        )

    op.execute("ALTER TABLE feedback_tickets ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY feedback_tickets_owner_policy ON feedback_tickets "
        "USING (true)"
    )


def downgrade() -> None:
    for table in _TABLES_WITH_USER_ID:
        op.execute(f"DROP POLICY IF EXISTS {table}_owner_policy ON {table}")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")

    op.execute("DROP POLICY IF EXISTS feedback_tickets_owner_policy ON feedback_tickets")
    op.execute("ALTER TABLE feedback_tickets DISABLE ROW LEVEL SECURITY")
