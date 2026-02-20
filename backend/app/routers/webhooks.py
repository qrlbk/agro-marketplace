from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.product import Product, ProductStatus
from app.dependencies import verify_webhook_1c_key
from app.services.redis_client import invalidate_product_cache

router = APIRouter()


class StockItem(BaseModel):
    article_number: str
    quantity: int


class StockPayload(BaseModel):
    items: list[StockItem]


@router.post("/1c/stock")
async def webhook_1c_stock(
    body: StockPayload,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_webhook_1c_key),
):
    updated = 0
    for it in body.items:
        result = await db.execute(select(Product).where(Product.article_number == it.article_number))
        product = result.scalar_one_or_none()
        if product:
            product.stock_quantity = max(0, it.quantity)
            product.status = ProductStatus.in_stock if product.stock_quantity > 0 else ProductStatus.on_order
            updated += 1
    await db.flush()
    await invalidate_product_cache()
    return {"updated": updated}
