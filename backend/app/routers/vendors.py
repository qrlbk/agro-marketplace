from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.user import User
from app.models.product import Product
from app.models.product_review import ProductReview
from app.schemas.review import VendorRatingOut

router = APIRouter()


@router.get("/{vendor_id}/rating", response_model=VendorRatingOut)
async def get_vendor_rating(vendor_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User.id).where(User.id == vendor_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(404, "Vendor not found")
    r = await db.execute(
        select(
            func.coalesce(func.avg(ProductReview.rating), 0).label("avg"),
            func.count(ProductReview.id).label("cnt"),
        )
        .select_from(ProductReview)
        .join(Product, ProductReview.product_id == Product.id)
        .where(Product.vendor_id == vendor_id)
    )
    row = r.one()
    avg_val = round(float(row.avg), 2) if row.avg is not None else 0.0
    cnt = row.cnt or 0
    return VendorRatingOut(average_rating=avg_val, total_reviews=cnt)
