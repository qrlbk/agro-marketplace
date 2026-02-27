import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.category import Category
from app.schemas.category import CategoryOut, CategoryCreate, CategoryTreeOut
from app.dependencies import get_current_admin

logger = logging.getLogger(__name__)
router = APIRouter()


def _build_tree(categories: list[Category], parent_id: int | None = None) -> list[CategoryTreeOut]:
    out = []
    for c in categories:
        if c.parent_id == parent_id:
            node = CategoryTreeOut(
                id=c.id,
                parent_id=c.parent_id,
                name=c.name,
                slug=c.slug,
                children=_build_tree(categories, c.id),
            )
            out.append(node)
    return out


@router.get("", response_model=list[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category).order_by(Category.slug))
    return [CategoryOut.model_validate(c) for c in result.scalars().all()]


@router.get("/tree", response_model=list[CategoryTreeOut])
async def tree_categories(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Category).order_by(Category.slug))
        categories = list(result.scalars().all())
        return _build_tree(categories)
    except Exception as e:
        logger.exception("Categories tree failed: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.post("", response_model=CategoryOut)
async def create_category(
    body: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    cat = Category(parent_id=body.parent_id, name=body.name, slug=body.slug)
    db.add(cat)
    await db.flush()
    await db.refresh(cat)
    return CategoryOut.model_validate(cat)


@router.delete("/{category_id}", status_code=204)
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    result = await db.execute(select(Category).where(Category.id == category_id))
    cat = result.scalar_one_or_none()
    if cat:
        await db.delete(cat)
