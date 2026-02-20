"""Build catalog context string for the chat assistant (real-time category tree + optional product counts/snippet)."""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.models.category import Category
from app.models.product import Product


def _build_tree_flat(categories: list[Category], parent_id: int | None = None, indent: int = 0) -> list[tuple[str, str, str]]:
    """Return list of (name, slug, indent_str) for serialization."""
    out = []
    for c in categories:
        if c.parent_id != parent_id:
            continue
        prefix = "  " * indent
        out.append((c.name, c.slug, prefix))
        out.extend(_build_tree_flat(categories, c.id, indent + 1))
    return out


async def build_catalog_context(db: AsyncSession, include_product_counts: bool = True) -> str:
    """Load category tree and optionally product counts; return a string for the LLM prompt."""
    result = await db.execute(select(Category).order_by(Category.slug))
    categories = list(result.scalars().all())
    if not categories:
        return "Каталог пуст (нет категорий)."

    lines = ["Текущие разделы каталога (на момент запроса):"]
    flat = _build_tree_flat(categories)
    for name, slug, prefix in flat:
        lines.append(f"{prefix}- {name} (slug: {slug})")

    if include_product_counts:
        count_stmt = (
            select(Product.category_id, func.count(Product.id).label("cnt"))
            .where(Product.category_id.isnot(None))
            .group_by(Product.category_id)
        )
        count_result = await db.execute(count_stmt)
        counts = {row[0]: row[1] for row in count_result.all()}

        def count_in_category(cat_id: int) -> int:
            total = counts.get(cat_id, 0)
            for c in categories:
                if c.parent_id == cat_id:
                    total += count_in_category(c.id)
            return total

        lines.append("")
        lines.append("Количество товаров по разделам (включая подразделы):")
        for c in categories:
            if c.parent_id is None:
                n = count_in_category(c.id)
                lines.append(f"- {c.name}: {n} товаров")

    return "\n".join(lines)


def _collect_descendant_ids(categories: list[Category], root_id: int) -> set[int]:
    by_parent: dict[int | None, list[Category]] = {}
    for c in categories:
        by_parent.setdefault(c.parent_id, []).append(c)
    ids = {root_id}

    def add_children(pid: int) -> None:
        for child in by_parent.get(pid) or []:
            ids.add(child.id)
            add_children(child.id)

    add_children(root_id)
    return ids


async def get_products_snippet(
    db: AsyncSession,
    q: str | None = None,
    category_id: int | None = None,
    limit: int = 15,
) -> str:
    """Return a short text list of products for the chat context (name, price, category)."""
    stmt = select(Product, Category.name).outerjoin(Category, Product.category_id == Category.id)
    category_ids: set[int] | None = None
    if category_id is not None:
        result = await db.execute(select(Category))
        all_cats = list(result.scalars().all())
        category_ids = _collect_descendant_ids(all_cats, category_id)
        stmt = stmt.where(Product.category_id.in_(category_ids))
    if q and q.strip():
        term = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Product.article_number.ilike(term),
                Product.name.ilike(term),
            )
        )
    stmt = stmt.order_by(Product.name).limit(limit)
    result = await db.execute(stmt)
    rows = result.all()
    if not rows:
        return ""

    lines = ["Примеры товаров (название, цена, категория):"]
    for product, cat_name in rows:
        price = float(product.price) if product.price else 0
        lines.append(f"- {product.name} — {price:.0f} ₸ ({cat_name or '—'})")
    return "\n".join(lines)
