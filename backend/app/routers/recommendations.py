"""Cross-sell and AI maintenance recommendations."""
import asyncio
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.product import Product
from app.models.category import Category
from app.models.garage import Garage
from app.models.machine import Machine
from app.models.compatibility import CompatibilityMatrix
from app.models.user import User
from app.dependencies import get_current_user_optional
from app.schemas.maintenance import MaintenanceAdviceOut
from app.services.maintenance import recommend_maintenance_kits
from pydantic import BaseModel

router = APIRouter()

# Rule: category name (or slug) -> recommended category slug for cross-sell
CROSS_SELL_RULES = {
    "moto-masla": "maslyanye-filtry",
    "moto-maslo": "maslyanye-filtry",
    "motor-oil": "oil-filters",
    "mоторные масла": "maslyanye-filtry",
    "масла моторные": "maslyanye-filtry",
}


class RecommendationOut(BaseModel):
    product_id: int
    name: str
    article_number: str
    price: float
    category_name: str | None
    message: str


@router.get("", response_model=list[RecommendationOut])
async def get_recommendations(
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    if not current_user:
        return []
    # Get user's garage machine_ids
    result = await db.execute(select(Garage).where(Garage.user_id == current_user.id))
    garages = result.scalars().all()
    if not garages:
        return []
    machine_ids = [g.machine_id for g in garages]
    # Get products compatible with these machines in "recommended" categories (e.g. oil filters)
    target_slugs = set(CROSS_SELL_RULES.values())
    cat_result = await db.execute(select(Category).where(Category.slug.in_(target_slugs)))
    categories = {c.slug: c for c in cat_result.scalars().all()}
    if not categories:
        return []
    cat_ids = [c.id for c in categories.values()]
    # Products in these categories that are compatible with user's machines
    stmt = (
        select(Product, Category.name)
        .join(Category, Product.category_id == Category.id)
        .join(CompatibilityMatrix, Product.id == CompatibilityMatrix.product_id)
        .where(
            Product.category_id.in_(cat_ids),
            CompatibilityMatrix.machine_id.in_(machine_ids),
            Product.stock_quantity > 0,
        )
        .limit(5)
    )
    result = await db.execute(stmt)
    rows = result.all()
    out = []
    for product, cat_name in rows:
        out.append(
            RecommendationOut(
                product_id=product.id,
                name=product.name,
                article_number=product.article_number,
                price=float(product.price),
                category_name=cat_name,
                message=f"Не забудьте для вашей техники: {product.name}",
            )
        )
    return out


@router.get("/maintenance", response_model=list[MaintenanceAdviceOut])
async def get_maintenance_recommendations(
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """AI-generated maintenance advice per garage machine (moto hours + service intervals)."""
    if not current_user:
        return []
    result = await db.execute(
        select(Garage, Machine.brand, Machine.model, Machine.year)
        .join(Machine, Garage.machine_id == Machine.id)
        .where(Garage.user_id == current_user.id)
    )
    rows = result.all()
    if not rows:
        return []

    async def advice_for_row(g: Garage, brand: str, model: str, year: int | None) -> MaintenanceAdviceOut:
        moto = g.moto_hours if g.moto_hours is not None else 0
        try:
            recs = await recommend_maintenance_kits(brand, model, year, moto)
            return MaintenanceAdviceOut(
                garage_id=g.id,
                machine_id=g.machine_id,
                brand=brand or "",
                model=model or "",
                year=year,
                moto_hours=g.moto_hours,
                recommendations=recs,
                error_message=None,
            )
        except Exception:
            return MaintenanceAdviceOut(
                garage_id=g.id,
                machine_id=g.machine_id,
                brand=brand or "",
                model=model or "",
                year=year,
                moto_hours=g.moto_hours,
                recommendations=[],
                error_message="Рекомендации временно недоступны.",
            )

    out = await asyncio.gather(
        *[advice_for_row(g, brand, model, year) for g, brand, model, year in rows]
    )
    return list(out)
