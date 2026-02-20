from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.database import get_db
from app.utils import generate_article_number
from app.models.product import Product, ProductStatus
from app.models.machine import Machine
from app.models.compatibility import CompatibilityMatrix
from app.services.compatibility_checker import verify_compatibility
from app.models.category import Category
from app.schemas.product import ProductOut, ProductListOut, ProductCreate, ProductUpdate, AddCompatibilityIn, CheckCompatibilityIn
from app.dependencies import get_current_vendor, get_current_admin, get_product_for_vendor
from app.models.user import User
from app.services.redis_client import get_redis, cache_get, cache_set, cache_key_prefix, invalidate_product_cache
from app.services.search_suggest import get_search_suggestions
from app.config import settings

router = APIRouter()


def _collect_category_and_descendant_ids(categories: list[Category], root_id: int) -> set[int]:
    """Return root_id and all descendant category ids (by parent_id)."""
    by_parent: dict[int | None, list[Category]] = {}
    for c in categories:
        by_parent.setdefault(c.parent_id, []).append(c)
    ids = {root_id}

    def add_children(pid: int) -> None:
        for c in by_parent.get(pid) or []:
            ids.add(c.id)
            add_children(c.id)

    add_children(root_id)
    return ids


async def _category_ids_for_filter(db: AsyncSession, category_id: int) -> set[int]:
    """Load all categories and return category_id plus all descendant ids."""
    result = await db.execute(select(Category))
    categories = list(result.scalars().all())
    return _collect_category_and_descendant_ids(categories, category_id)


def _cache_key(
    q: str | None,
    category_id: int | None,
    vendor_id: int | None,
    machine_id: int | None,
    skip: int,
    limit: int,
    expand: bool = False,
) -> str:
    parts = [
        cache_key_prefix(),
        f"q={q or ''}",
        f"cat={category_id or ''}",
        f"v={vendor_id or ''}",
        f"m={machine_id or ''}",
        f"expand={1 if expand else 0}",
        f"{skip}",
        f"{limit}",
    ]
    return ":".join(parts)


async def _query_products(
    db: AsyncSession,
    q: str | None = None,
    search_terms: list[str] | None = None,
    category_ids: set[int] | None = None,
    vendor_id: int | None = None,
    machine_id: int | None = None,
    skip: int = 0,
    limit: int = 20,
):
    stmt = select(Product)
    if machine_id is not None:
        stmt = stmt.join(CompatibilityMatrix, Product.id == CompatibilityMatrix.product_id).where(
            CompatibilityMatrix.machine_id == machine_id
        )
    if category_ids is not None:
        stmt = stmt.where(Product.category_id.in_(category_ids))
    if vendor_id is not None:
        stmt = stmt.where(Product.vendor_id == vendor_id)
    terms = search_terms if search_terms else ([q.strip()] if q and q.strip() else [])
    if terms:
        cond = or_(
            *[
                or_(
                    Product.article_number.ilike(f"%{t}%"),
                    Product.name.ilike(f"%{t}%"),
                )
                for t in terms
            ]
        )
        stmt = stmt.where(cond)
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0
    # Order: In_Stock first, then On_Order
    stmt = stmt.order_by(
        (Product.status == ProductStatus.in_stock).desc(),
        Product.name,
    ).offset(skip).limit(limit)
    result = await db.execute(stmt)
    products = result.scalars().unique().all()
    return list(products), total


@router.get("", response_model=ProductListOut)
async def list_products(
    q: str | None = Query(None),
    expand: bool = Query(False),
    category_id: int | None = Query(None),
    vendor_id: int | None = Query(None),
    machine_id: int | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    search_terms: list[str] | None = None
    suggested_terms: list[str] | None = None
    if q and q.strip() and expand:
        try:
            suggest = await get_search_suggestions(q.strip())
            search_terms = suggest.expanded_terms
            suggested_terms = suggest.expanded_terms
        except Exception:
            pass

    ckey = _cache_key(q, category_id, vendor_id, machine_id, skip, limit, expand=expand)
    cached = await cache_get(ckey)
    if cached is not None:
        return ProductListOut(**cached)
    category_ids = await _category_ids_for_filter(db, category_id) if category_id is not None else None
    products, total = await _query_products(
        db,
        q=q,
        search_terms=search_terms,
        category_ids=category_ids,
        vendor_id=vendor_id,
        machine_id=machine_id,
        skip=skip,
        limit=limit,
    )
    cat_ids = list({p.category_id for p in products if p.category_id is not None})
    cat_slug_by_id: dict[int, str] = {}
    if cat_ids:
        cat_result = await db.execute(select(Category.id, Category.slug).where(Category.id.in_(cat_ids)))
        for cid, slug in cat_result.all():
            cat_slug_by_id[cid] = slug
    items = [_product_out_with_category_slug(p, cat_slug_by_id.get(p.category_id) if p.category_id else None) for p in products]
    out = ProductListOut(items=items, total=total, suggested_terms=suggested_terms)
    await cache_set(ckey, out.model_dump(mode="json"))
    return out


@router.post("/check-compatibility")
async def check_compatibility(
    body: CheckCompatibilityIn,
    db: AsyncSession = Depends(get_db),
):
    """AI check: is this product suitable for this machine? Does not modify CompatibilityMatrix."""
    result = await db.execute(select(Product).where(Product.id == body.product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")
    result = await db.execute(select(Machine).where(Machine.id == body.machine_id))
    machine = result.scalar_one_or_none()
    if not machine:
        raise HTTPException(404, "Machine not found")
    verification = await verify_compatibility(
        product_name=product.name,
        product_description=product.description,
        machine_brand=machine.brand,
        machine_model=machine.model,
        machine_year=machine.year,
    )
    return verification.model_dump()


def _product_out_with_category_slug(product: Product, category_slug: str | None) -> ProductOut:
    data = ProductOut.model_validate(product).model_dump()
    data["category_slug"] = category_slug
    return ProductOut(**data)


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Product, Category.slug).outerjoin(Category, Product.category_id == Category.id).where(Product.id == product_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(404, "Product not found")
    product, cat_slug = row
    return _product_out_with_category_slug(product, cat_slug)


@router.post("", response_model=ProductOut)
async def create_product(
    body: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_vendor),
):
    article_number = (body.article_number or "").strip() or generate_article_number()
    product = Product(
        vendor_id=current_user.id,
        category_id=body.category_id,
        name=body.name,
        article_number=article_number,
        price=body.price,
        stock_quantity=body.stock_quantity,
        description=body.description,
        characteristics=body.characteristics,
        composition=body.composition,
        images=body.images,
        status=body.status,
    )
    db.add(product)
    await db.flush()
    await db.refresh(product)
    await invalidate_product_cache()
    return ProductOut.model_validate(product)


@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(
    body: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    product: Product = Depends(get_product_for_vendor),
):
    updates = body.model_dump(exclude_unset=True)
    if "article_number" in updates and not (updates["article_number"] or "").strip():
        updates["article_number"] = generate_article_number()
    for k, v in updates.items():
        setattr(product, k, v)
    await db.flush()
    await db.refresh(product)
    await invalidate_product_cache()
    return ProductOut.model_validate(product)


@router.post("/{product_id}/compatibility", status_code=201)
async def add_compatibility(
    body: AddCompatibilityIn,
    product: Product = Depends(get_product_for_vendor),
    db: AsyncSession = Depends(get_db),
):
    comp = CompatibilityMatrix(product_id=product.id, machine_id=body.machine_id)
    db.add(comp)
    await db.flush()
    await invalidate_product_cache()
    return {"product_id": product.id, "machine_id": body.machine_id}


@router.delete("/{product_id}", status_code=204)
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if product:
        await db.delete(product)
        await invalidate_product_cache()
