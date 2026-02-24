"""Companies table, user role user, region, company_id

Revision ID: 003
Revises: 002
Create Date: 2025-02-20

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create company status enum only if not exists (PostgreSQL)
    op.execute(
        "DO $$ BEGIN CREATE TYPE companystatus AS ENUM ('pending_approval', 'approved'); "
        "EXCEPTION WHEN duplicate_object THEN NULL; END $$"
    )

    op.create_table(
        "companies",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("bin", sa.String(12), nullable=False),
        sa.Column("name", sa.String(512), nullable=True),
        sa.Column("legal_address", sa.String(512), nullable=True),
        sa.Column("chairman_name", sa.String(255), nullable=True),
        sa.Column("bank_iik", sa.String(50), nullable=True),
        sa.Column("bank_bik", sa.String(50), nullable=True),
        sa.Column("status", ENUM("pending_approval", "approved", name="companystatus", create_type=False), nullable=False, server_default="approved"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_companies_bin", "companies", ["bin"], unique=True)

    # Add new value to userrole enum (PostgreSQL)
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'user'")

    # Add columns to users
    op.add_column("users", sa.Column("region", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("company_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_users_company_id",
        "users",
        "companies",
        ["company_id"],
        ["id"],
    )
    op.create_index("ix_users_company_id", "users", ["company_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_users_company_id", table_name="users")
    op.drop_constraint("fk_users_company_id", "users", type_="foreignkey")
    op.drop_column("users", "company_id")
    op.drop_column("users", "region")
    # Note: cannot remove 'user' from userrole enum in PostgreSQL easily; leave it
    op.drop_index("ix_companies_bin", table_name="companies")
    op.drop_table("companies")
    sa.Enum(name="companystatus").drop(op.get_bind(), checkfirst=True)
