from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.product import Product, ProductStatus
from app.models.user import User
from app.dependencies import get_current_vendor
from app.services.redis_client import invalidate_product_cache
from app.utils import generate_article_number
from app.services.price_parser import (
    get_column_mapping_from_llm,
    parse_excel_with_mapping,
    apply_fuzzy_name_correction,
)
from app.config import settings
import pandas as pd
import io

router = APIRouter()
MAX_MB = 10

# Директория для загруженных фото товаров (относительно корня backend)
UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "products"
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_MB = getattr(settings, "max_upload_mb", 10)


@router.post("/upload-pricelist")
async def upload_pricelist(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_vendor),
):
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(400, "Only Excel files (.xlsx, .xls) allowed")
    content = await file.read()
    if len(content) > MAX_MB * 1024 * 1024:
        raise HTTPException(400, f"File too large (max {MAX_MB} MB)")
    df = pd.read_excel(io.BytesIO(content), header=0)
    sample = df.head(15).to_dict(orient="records")
    sample_rows = []
    for r in sample:
        row = {}
        for k, v in r.items():
            if pd.notna(v):
                row[str(k)] = str(v) if not isinstance(v, (int, float)) else v
        sample_rows.append(row)
    mapping_result = await get_column_mapping_from_llm(sample_rows)
    rows = parse_excel_with_mapping(content, mapping_result.mapping)
    # Fuzzy name correction when LLM was unsure about the name column
    known_names_result = await db.execute(
        select(Product.name).where(Product.vendor_id == current_user.id).distinct().limit(500)
    )
    known_names = [r[0] for r in known_names_result.all() if r[0]]
    rows = apply_fuzzy_name_correction(rows, mapping_result.confidence, known_part_names=known_names or None)
    created = 0
    updated = 0
    for r in rows:
        article = (r.get("article_number") or "").strip() or generate_article_number()
        name = r.get("name", "")
        price = r.get("price", 0)
        qty = r.get("quantity", 0)
        if not name:
            continue
        result = await db.execute(select(Product).where(Product.article_number == article, Product.vendor_id == current_user.id))
        existing = result.scalar_one_or_none()
        if existing:
            existing.name = name
            existing.price = price
            existing.stock_quantity = qty
            existing.status = ProductStatus.in_stock if qty > 0 else ProductStatus.on_order
            updated += 1
        else:
            product = Product(
                vendor_id=current_user.id,
                name=name,
                article_number=article,
                price=price,
                stock_quantity=qty,
                status=ProductStatus.in_stock if qty > 0 else ProductStatus.on_order,
            )
            db.add(product)
            created += 1
    await db.flush()
    await invalidate_product_cache()
    return {
        "created": created,
        "updated": updated,
        "rows_processed": len(rows),
        "mapping_confidence": mapping_result.confidence,
    }


@router.post("/upload-image")
async def upload_product_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_vendor),
):
    """Загрузка фото товара. Возвращает URL для сохранения в product.images."""
    if not file.filename:
        raise HTTPException(400, "Файл без имени")
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(400, f"Разрешены только изображения: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}")
    content_type = file.content_type or ""
    if content_type and content_type not in ALLOWED_IMAGE_CONTENT_TYPES and not content_type.startswith("image/"):
        raise HTTPException(400, "Файл должен быть изображением")
    content = await file.read()
    if len(content) > MAX_IMAGE_MB * 1024 * 1024:
        raise HTTPException(400, f"Размер файла не более {MAX_IMAGE_MB} МБ")
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    name = f"{uuid4().hex}{ext}"
    path = UPLOADS_DIR / name
    path.write_bytes(content)
    # Путь для фронтенда: /uploads/products/xxx (без /api, прокси сам добавит)
    url = f"/uploads/products/{name}"
    return {"url": url}
