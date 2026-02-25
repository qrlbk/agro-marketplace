"""Build catalog context string for the chat assistant (real-time category tree + optional product counts/snippet)."""
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.models.category import Category
from app.models.product import Product, ProductStatus
from app.models.compatibility import CompatibilityMatrix


def _build_tree_flat(
    categories: list[Category],
    parent_id: int | None = None,
    indent: int = 0,
    max_depth: int | None = None,
) -> list[tuple[str, str, str, int]]:
    """Return list of (name, slug, indent_str, id) for serialization. Optional max_depth to limit depth."""
    out = []
    for c in categories:
        if c.parent_id != parent_id:
            continue
        if max_depth is not None and indent >= max_depth:
            continue
        prefix = "  " * indent
        out.append((c.name, c.slug, prefix, c.id))
        out.extend(_build_tree_flat(categories, c.id, indent + 1, max_depth=max_depth))
    return out


async def build_catalog_context(
    db: AsyncSession,
    include_product_counts: bool = True,
    max_depth: int = 3,
    max_category_entries: int = 80,
) -> str:
    """Load category tree and optionally product counts; return a string for the LLM prompt. Limited by max_depth and max_category_entries to reduce tokens."""
    result = await db.execute(select(Category).order_by(Category.slug))
    categories = list(result.scalars().all())
    if not categories:
        return "Каталог пуст (нет категорий)."

    lines = ["Текущие разделы каталога (на момент запроса). Формат ссылки: /catalog?category=ID или /catalog?q=поиск:"]
    flat = _build_tree_flat(categories, max_depth=max_depth)[:max_category_entries]
    for name, slug, prefix, cid in flat:
        lines.append(f"{prefix}- {name} (id: {cid}, slug: {slug})")

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


def _normalize_for_match(s: str) -> str:
    """Lowercase and collapse spaces for matching."""
    return (s or "").lower().strip()


async def resolve_category_by_query(db: AsyncSession, query: str) -> int | None:
    """Find a category whose name or slug is mentioned in the query (e.g. 'удобрения' -> Удобрения).
    Returns category id or None. Prefers root-level categories for clearer catalog navigation.
    """
    if not (query or "").strip():
        return None
    result = await db.execute(select(Category).order_by(Category.slug))
    categories = list(result.scalars().all())
    if not categories:
        return None
    query_lower = _normalize_for_match(query)
    # Words from query (min length 3 to avoid noise)
    words = [w for w in re.split(r"\W+", query_lower) if len(w) >= 3]
    for cat in categories:
        name_lower = _normalize_for_match(cat.name)
        slug_lower = _normalize_for_match(cat.slug)
        if not name_lower and not slug_lower:
            continue
        if name_lower in query_lower or slug_lower in query_lower:
            return cat.id
        for w in words:
            if w in name_lower or name_lower in w or w in slug_lower or slug_lower in w:
                return cat.id
    return None


async def get_products_snippet(
    db: AsyncSession,
    q: str | None = None,
    category_id: int | None = None,
    search_terms: list[str] | None = None,
    machine_id: int | None = None,
    limit: int = 15,
) -> str:
    """Return a short text list of products for the chat context (name, price, category).
    Uses search_terms (OR) when provided, else q. Filters by machine compatibility when machine_id is set.
    """
    stmt = select(Product, Category.name).outerjoin(Category, Product.category_id == Category.id)

    if machine_id is not None:
        stmt = stmt.join(CompatibilityMatrix, Product.id == CompatibilityMatrix.product_id).where(
            CompatibilityMatrix.machine_id == machine_id
        )

    stmt = stmt.where(Product.stock_quantity > 0)

    category_ids: set[int] | None = None
    if category_id is not None:
        result = await db.execute(select(Category))
        all_cats = list(result.scalars().all())
        category_ids = _collect_descendant_ids(all_cats, category_id)
        stmt = stmt.where(Product.category_id.in_(category_ids))

    terms = search_terms if search_terms else ([q.strip()] if q and q.strip() else [])
    if terms:
        stmt = stmt.where(
            or_(
                *[
                    or_(
                        Product.article_number.ilike(f"%{t}%"),
                        Product.name.ilike(f"%{t}%"),
                    )
                    for t in terms
                ]
            )
        )

    stmt = stmt.order_by(
        (Product.status == ProductStatus.in_stock).desc(),
        Product.name,
    ).limit(limit)
    result = await db.execute(stmt)
    rows = result.all()
    if not rows:
        return ""

    max_name_len = 70
    lines = ["Примеры товаров (название, цена):"]
    for product, _cat_name in rows:
        price = float(product.price) if product.price else 0
        name = (product.name or "")[:max_name_len]
        if len(product.name or "") > max_name_len:
            name += "…"
        lines.append(f"- {name} — {price:.0f} ₸")
    return "\n".join(lines)
