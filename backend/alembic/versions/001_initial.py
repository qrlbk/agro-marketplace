"""Initial schema

Revision ID: 001
Revises:
Create Date: 2025-02-19

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("role", sa.Enum("guest", "farmer", "vendor", "admin", name="userrole"), nullable=False),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("company_details", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_phone", "users", ["phone"], unique=True)
    op.create_index("ix_users_role", "users", ["role"], unique=False)

    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False),
        sa.ForeignKeyConstraint(["parent_id"], ["categories.id"],),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_categories_parent_id", "categories", ["parent_id"], unique=False)
    op.create_index("ix_categories_slug", "categories", ["slug"], unique=True)

    op.create_table(
        "machines",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("brand", sa.String(128), nullable=False),
        sa.Column("model", sa.String(128), nullable=False),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_machines_brand", "machines", ["brand"], unique=False)
    op.create_index("ix_machines_model", "machines", ["model"], unique=False)

    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("vendor_id", sa.Integer(), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(512), nullable=False),
        sa.Column("article_number", sa.String(128), nullable=False),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("stock_quantity", sa.Integer(), nullable=True),
        sa.Column("description", sa.String(2048), nullable=True),
        sa.Column("images", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("status", sa.Enum("In_Stock", "On_Order", name="productstatus"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["vendor_id"], ["users.id"],),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"],),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_products_article_number", "products", ["article_number"], unique=True)
    op.create_index("ix_products_vendor_id", "products", ["vendor_id"], unique=False)
    op.create_index("ix_products_category_id", "products", ["category_id"], unique=False)

    op.create_table(
        "compatibility_matrix",
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("machine_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"],),
        sa.ForeignKeyConstraint(["machine_id"], ["machines.id"],),
        sa.PrimaryKeyConstraint("product_id", "machine_id"),
        sa.UniqueConstraint("product_id", "machine_id", name="uq_compatibility_product_machine"),
    )

    op.create_table(
        "garages",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("machine_id", sa.Integer(), nullable=False),
        sa.Column("serial_number", sa.String(128), nullable=True),
        sa.Column("moto_hours", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"],),
        sa.ForeignKeyConstraint(["machine_id"], ["machines.id"],),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_garages_user_id", "garages", ["user_id"], unique=False)
    op.create_index("ix_garages_machine_id", "garages", ["machine_id"], unique=False)

    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("vendor_id", sa.Integer(), nullable=False),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.Enum("New", "Paid", "Shipped", "Delivered", name="orderstatus"), nullable=True),
        sa.Column("delivery_address", sa.String(512), nullable=True),
        sa.Column("comment", sa.String(1024), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"],),
        sa.ForeignKeyConstraint(["vendor_id"], ["users.id"],),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_orders_user_id", "orders", ["user_id"], unique=False)
    op.create_index("ix_orders_vendor_id", "orders", ["vendor_id"], unique=False)
    op.create_index("ix_orders_status", "orders", ["status"], unique=False)

    op.create_table(
        "order_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("price_at_order", sa.Numeric(12, 2), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"],),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"],),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"], unique=False)


def downgrade() -> None:
    op.drop_table("order_items")
    op.drop_table("orders")
    op.drop_table("garages")
    op.drop_table("compatibility_matrix")
    op.drop_table("products")
    op.drop_table("machines")
    op.drop_table("categories")
    op.drop_table("users")
    sa.Enum(name="orderstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="productstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="userrole").drop(op.get_bind(), checkfirst=True)
