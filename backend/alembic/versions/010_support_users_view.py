"""Grant Support role users.view permission

Revision ID: 010
Revises: 009
Create Date: 2025-02-24

"""
from typing import Sequence, Union
from alembic import op
from sqlalchemy import text

revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    role_row = conn.execute(text("SELECT id FROM roles WHERE slug = 'support'")).fetchone()
    perm_row = conn.execute(text("SELECT id FROM permissions WHERE code = 'users.view'")).fetchone()
    if not role_row or not perm_row:
        return
    role_id, perm_id = role_row[0], perm_row[0]
    existing = conn.execute(
        text("SELECT 1 FROM role_permissions WHERE role_id = :role_id AND permission_id = :perm_id"),
        {"role_id": role_id, "perm_id": perm_id},
    ).fetchone()
    if not existing:
        conn.execute(
            text("INSERT INTO role_permissions (role_id, permission_id) VALUES (:role_id, :permission_id)"),
            {"role_id": role_id, "permission_id": perm_id},
        )


def downgrade() -> None:
    conn = op.get_bind()
    role_row = conn.execute(text("SELECT id FROM roles WHERE slug = 'support'")).fetchone()
    perm_row = conn.execute(text("SELECT id FROM permissions WHERE code = 'users.view'")).fetchone()
    if role_row and perm_row:
        conn.execute(
            text("DELETE FROM role_permissions WHERE role_id = :role_id AND permission_id = :permission_id"),
            {"role_id": role_row[0], "permission_id": perm_row[0]},
        )
