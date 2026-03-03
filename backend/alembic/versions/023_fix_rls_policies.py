"""Fix RLS policies to enforce real ownership via app.current_user_id.

Drops the permissive USING(true) policies from 022 and creates policies that
filter by current_setting('app.current_user_id')::int = user_id.

The application must SET LOCAL app.current_user_id at the start of each
transaction (e.g. -1 for unauthenticated, user id for authenticated).
The app DB role must NOT be the table owner (owner bypasses RLS).

Revision ID: 023
Revises: 022
Create Date: 2026-03-02

"""
from typing import Sequence, Union

from alembic import op

revision: str = "023"
down_revision: Union[str, None] = "022"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLES_WITH_USER_ID = ["orders", "notifications", "cart_items"]

# Policy expression: row visible only when session variable equals row's user_id
_RLS_EXPR = "(current_setting('app.current_user_id', true)::int = user_id)"


def upgrade() -> None:
    for table in _TABLES_WITH_USER_ID:
        op.execute(f"DROP POLICY IF EXISTS {table}_owner_policy ON {table}")
        op.execute(
            f"CREATE POLICY {table}_owner_policy ON {table} "
            f"USING {_RLS_EXPR}"
        )

    op.execute("DROP POLICY IF EXISTS feedback_tickets_owner_policy ON feedback_tickets")
    op.execute(
        "CREATE POLICY feedback_tickets_owner_policy ON feedback_tickets "
        f"USING {_RLS_EXPR}"
    )


def downgrade() -> None:
    for table in _TABLES_WITH_USER_ID:
        op.execute(f"DROP POLICY IF EXISTS {table}_owner_policy ON {table}")
        op.execute(
            f"CREATE POLICY {table}_owner_policy ON {table} USING (true)"
        )

    op.execute("DROP POLICY IF EXISTS feedback_tickets_owner_policy ON feedback_tickets")
    op.execute(
        "CREATE POLICY feedback_tickets_owner_policy ON feedback_tickets USING (true)"
    )
