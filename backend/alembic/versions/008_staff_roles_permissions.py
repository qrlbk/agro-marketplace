"""Staff, roles, permissions

Revision ID: 008
Revises: 007
Create Date: 2025-02-24

"""
from typing import Sequence, Union
import os
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PERMISSION_CODES = [
    ("dashboard.view", "Просмотр дашборда"),
    ("orders.view", "Просмотр заказов"),
    ("orders.edit", "Редактирование заказов"),
    ("vendors.view", "Просмотр поставщиков"),
    ("vendors.approve", "Одобрение поставщиков"),
    ("feedback.view", "Просмотр обращений"),
    ("feedback.edit", "Редактирование обращений"),
    ("users.view", "Просмотр пользователей"),
    ("users.edit", "Редактирование пользователей"),
    ("audit.view", "Просмотр журнала действий"),
    ("search.view", "Глобальный поиск"),
    ("staff.manage", "Управление сотрудниками"),
    ("roles.manage", "Управление ролями"),
]

ROLES = [
    ("Super Admin", "super_admin", True),
    ("Admin", "admin", True),
    ("Support", "support", True),
]

# super_admin gets all; admin gets all except staff.manage, roles.manage; support gets feedback.view, feedback.edit, search.view
ROLE_PERMISSIONS = {
    "super_admin": [c for c, _ in PERMISSION_CODES],
    "admin": [c for c, _ in PERMISSION_CODES if c not in ("staff.manage", "roles.manage")],
    "support": ["feedback.view", "feedback.edit", "search.view"],
}


def upgrade() -> None:
    op.create_table(
        "permissions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("code", sa.String(64), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_permissions_code", "permissions", ["code"], unique=True)

    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("slug", sa.String(64), nullable=False),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default="true"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_roles_slug", "roles", ["slug"], unique=True)

    op.create_table(
        "role_permissions",
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.Column("permission_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["permission_id"], ["permissions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("role_id", "permission_id"),
    )

    op.create_table(
        "staff",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("login", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_staff_login", "staff", ["login"], unique=True)
    op.create_index("ix_staff_role_id", "staff", ["role_id"], unique=False)

    conn = op.get_bind()

    for code, name in PERMISSION_CODES:
        conn.execute(text("INSERT INTO permissions (code, name) VALUES (:code, :name)"), {"code": code, "name": name})

    for name, slug, is_system in ROLES:
        conn.execute(
            text("INSERT INTO roles (name, slug, is_system) VALUES (:name, :slug, :is_system)"),
            {"name": name, "slug": slug, "is_system": is_system},
        )

    # Resolve permission_id by code and role_id by slug for role_permissions
    for slug, codes in ROLE_PERMISSIONS.items():
        role_row = conn.execute(text("SELECT id FROM roles WHERE slug = :slug"), {"slug": slug}).fetchone()
        if not role_row:
            continue
        role_id = role_row[0]
        for code in codes:
            perm_row = conn.execute(text("SELECT id FROM permissions WHERE code = :code"), {"code": code}).fetchone()
            if perm_row:
                conn.execute(
                    text("INSERT INTO role_permissions (role_id, permission_id) VALUES (:role_id, :permission_id)"),
                    {"role_id": role_id, "permission_id": perm_row[0]},
                )

    # First staff: Super Admin (role_id=1)
    from passlib.context import CryptContext
    pwd = os.environ.get("STAFF_DEFAULT_PASSWORD")
    login = os.environ.get("STAFF_DEFAULT_LOGIN")
    if not login or not pwd:
        raise RuntimeError(
            "Environment variables STAFF_DEFAULT_LOGIN and STAFF_DEFAULT_PASSWORD must be set "
            "before running migration 008 (staff bootstrap)."
        )
    ctx = CryptContext(schemes=["bcrypt"])
    password_hash = ctx.hash(pwd)
    conn.execute(
        text(
            "INSERT INTO staff (login, password_hash, role_id, name, is_active, created_at, updated_at) "
            "VALUES (:login, :password_hash, 1, :name, true, NOW() AT TIME ZONE 'UTC', NOW() AT TIME ZONE 'UTC')"
        ),
        {"login": login, "password_hash": password_hash, "name": "Admin"},
    )


def downgrade() -> None:
    op.drop_index("ix_staff_role_id", table_name="staff")
    op.drop_index("ix_staff_login", table_name="staff")
    op.drop_table("staff")
    op.drop_table("role_permissions")
    op.drop_index("ix_roles_slug", table_name="roles")
    op.drop_table("roles")
    op.drop_index("ix_permissions_code", table_name="permissions")
    op.drop_table("permissions")
