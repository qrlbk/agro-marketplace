"""Seed: showcase-ready AgTech B2B data. Idempotent (upserts). Run after alembic upgrade head."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select, delete
from app.database import async_session_maker
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.machine import Machine
from app.models.product import Product, ProductStatus
from app.models.compatibility import CompatibilityMatrix

# Demo users: Admin +77001112233, Farmer +77009998877 (login via OTP)
DEMO_USERS = [
    {"phone": "+77001112233", "role": UserRole.admin, "name": "Admin"},
    {"phone": "+77009998877", "role": UserRole.farmer, "name": "Farmer"},
]

# Root categories (parent_id=None): (name, slug)
ROOT_CATEGORIES = [
    ("Запчасти и техника", "zapchasti-tehnika"),
    ("Семена", "semena"),
    ("Удобрения", "udobreniya"),
    ("СЗР / Химия", "szr-himiya"),
]

# Child categories: (name, slug, parent_slug)
CHILD_CATEGORIES = [
    # under zapchasti-tehnika
    ("Фильтры и ТО", "filtry-i-to", "zapchasti-tehnika"),
    ("Запчасти двигателя", "zapchasti-dvigatelya", "zapchasti-tehnika"),
    ("Масла и Смазки", "masla-i-smazki", "zapchasti-tehnika"),
    # under semena
    ("Зерновые", "semena-zernovye", "semena"),
    ("Масличные", "semena-maslichnye", "semena"),
    # under udobreniya
    ("Минеральные", "udobreniya-mineralnye", "udobreniya"),
    ("Органические", "udobreniya-organicheskie", "udobreniya"),
    # under szr-himiya
    ("Гербициды", "szr-gerbicidy", "szr-himiya"),
    ("Инсектициды", "szr-insektitsidy", "szr-himiya"),
]

# Machines: brand, model, year
MACHINES = [
    ("John Deere", "8R 340", 2022),
    ("John Deere", "S700", 2021),
]

# Products: name, article_number, price_kzt, category_slug, status, machine_models (optional; only for parts)
PRODUCTS_PARTS = [
    {"name": "Фильтр масляный John Deere (RE504836)", "article_number": "RE504836", "price_kzt": 18500, "category_slug": "filtry-i-to", "status": ProductStatus.in_stock, "machine_models": ["8R 340"]},
    {"name": "Топливный фильтр (DZ10011)", "article_number": "DZ10011", "price_kzt": 24000, "category_slug": "filtry-i-to", "status": ProductStatus.in_stock, "machine_models": ["8R 340"]},
    {"name": "Воздушный фильтр кабины", "article_number": "AF-CAB-001", "price_kzt": 15000, "category_slug": "filtry-i-to", "status": ProductStatus.on_order, "machine_models": ["8R 340"]},
    {"name": "Ремень генератора (R502233)", "article_number": "R502233", "price_kzt": 45000, "category_slug": "zapchasti-dvigatelya", "status": ProductStatus.in_stock, "machine_models": ["8R 340"]},
    {"name": "Масло моторное Plus-50 II 15W-40 (20л)", "article_number": "TMS-PLUS50-20", "price_kzt": 65000, "category_slug": "masla-i-smazki", "status": ProductStatus.in_stock, "machine_models": ["8R 340", "S700"]},
    {"name": "Свеча накаливания (GPR-12)", "article_number": "GPR-12", "price_kzt": 8500, "category_slug": "zapchasti-dvigatelya", "status": ProductStatus.on_order, "machine_models": ["8R 340"]},
    {"name": "Фильтр гидравлический (HHV15)", "article_number": "HHV15", "price_kzt": 32000, "category_slug": "filtry-i-to", "status": ProductStatus.in_stock, "machine_models": ["8R 340"]},
    {"name": "Сегмент ножа жатки (SN-407)", "article_number": "SN-407", "price_kzt": 12000, "category_slug": "zapchasti-dvigatelya", "status": ProductStatus.in_stock, "machine_models": ["S700"]},
    {"name": "Палец шнека (PS-220)", "article_number": "PS-220", "price_kzt": 8500, "category_slug": "zapchasti-dvigatelya", "status": ProductStatus.on_order, "machine_models": ["S700"]},
    {"name": "Подшипник шнека (BS-701)", "article_number": "BS-701", "price_kzt": 18000, "category_slug": "zapchasti-dvigatelya", "status": ProductStatus.in_stock, "machine_models": ["S700"]},
    {"name": "Ремень привода жатки S700", "article_number": "JD-S700-HB", "price_kzt": 28000, "category_slug": "zapchasti-dvigatelya", "status": ProductStatus.in_stock, "machine_models": ["S700"]},
    {"name": "Фильтр воздушный двигателя (AIF-8R)", "article_number": "AIF-8R", "price_kzt": 19500, "category_slug": "filtry-i-to", "status": ProductStatus.on_order, "machine_models": ["8R 340"]},
]

PRODUCTS_SEEDS = [
    {"name": "Пшеница озимая сорт Казахстанская 10", "article_number": "SEM-WHT-001", "price_kzt": 85000, "category_slug": "semena-zernovye", "status": ProductStatus.in_stock},
    {"name": "Ячмень пивоваренный сорт Омский 90", "article_number": "SEM-BAR-002", "price_kzt": 62000, "category_slug": "semena-zernovye", "status": ProductStatus.in_stock},
    {"name": "Подсолнечник гибрид Тунка", "article_number": "SEM-SUN-001", "price_kzt": 125000, "category_slug": "semena-maslichnye", "status": ProductStatus.on_order},
    {"name": "Рапс озимый сорт Лира", "article_number": "SEM-RAP-001", "price_kzt": 98000, "category_slug": "semena-maslichnye", "status": ProductStatus.in_stock},
]

PRODUCTS_FERTILIZERS = [
    {"name": "Аммиачная селитра 34,4% (мешок 50 кг)", "article_number": "FERT-AN-50", "price_kzt": 18500, "category_slug": "udobreniya-mineralnye", "status": ProductStatus.in_stock},
    {"name": "НПК 16:16:16 (мешок 50 кг)", "article_number": "FERT-NPK-50", "price_kzt": 22000, "category_slug": "udobreniya-mineralnye", "status": ProductStatus.in_stock},
    {"name": "Навоз конский перепревший (биг-бэг)", "article_number": "FERT-MAN-001", "price_kzt": 45000, "category_slug": "udobreniya-organicheskie", "status": ProductStatus.on_order},
    {"name": "Компост органический (палета)", "article_number": "FERT-COMP-001", "price_kzt": 120000, "category_slug": "udobreniya-organicheskie", "status": ProductStatus.in_stock},
]

PRODUCTS_SZR = [
    {"name": "Гербицид сплошного действия (канистра 5 л)", "article_number": "SZR-HERB-5L", "price_kzt": 35000, "category_slug": "szr-gerbicidy", "status": ProductStatus.in_stock},
    {"name": "Гербицид против злаковых (флакон 1 л)", "article_number": "SZR-HERB-1L", "price_kzt": 18500, "category_slug": "szr-gerbicidy", "status": ProductStatus.in_stock},
    {"name": "Инсектицид контактно-кишечный (ампулы)", "article_number": "SZR-INS-001", "price_kzt": 8500, "category_slug": "szr-insektitsidy", "status": ProductStatus.on_order},
    {"name": "Инсектицид системный (канистра 10 л)", "article_number": "SZR-INS-10L", "price_kzt": 42000, "category_slug": "szr-insektitsidy", "status": ProductStatus.in_stock},
]

PRODUCTS = PRODUCTS_PARTS + PRODUCTS_SEEDS + PRODUCTS_FERTILIZERS + PRODUCTS_SZR


async def seed():
    async with async_session_maker() as db:
        # --- Users (upsert by phone) ---
        admin_user = None
        for u in DEMO_USERS:
            r = await db.execute(select(User).where(User.phone == u["phone"]))
            user = r.scalar_one_or_none()
            if user:
                user.role = u["role"]
                user.name = u["name"]
            else:
                user = User(role=u["role"], phone=u["phone"], name=u["name"])
                db.add(user)
            await db.flush()
            if u["role"] == UserRole.admin:
                admin_user = user
        if admin_user is None:
            raise RuntimeError("Admin user not found after upsert")
        print("Upserted users (Admin +77001112233, Farmer +77009998877)")

        # --- Root categories (parent_id=None) ---
        category_by_slug = {}
        for name, slug in ROOT_CATEGORIES:
            r = await db.execute(select(Category).where(Category.slug == slug))
            cat = r.scalar_one_or_none()
            if cat:
                cat.name = name
                cat.parent_id = None
            else:
                cat = Category(name=name, slug=slug, parent_id=None)
                db.add(cat)
            await db.flush()
            category_by_slug[slug] = cat.id
        print("Upserted root categories (Запчасти и техника, Семена, Удобрения, СЗР)")

        # --- Child categories ---
        for name, slug, parent_slug in CHILD_CATEGORIES:
            parent_id = category_by_slug.get(parent_slug)
            r = await db.execute(select(Category).where(Category.slug == slug))
            cat = r.scalar_one_or_none()
            if cat:
                cat.name = name
                cat.parent_id = parent_id
            else:
                cat = Category(name=name, slug=slug, parent_id=parent_id)
                db.add(cat)
            await db.flush()
            category_by_slug[slug] = cat.id
        print("Upserted child categories")

        # --- Machines (upsert by brand, model) ---
        machine_by_model = {}
        for brand, model, year in MACHINES:
            r = await db.execute(select(Machine).where(Machine.brand == brand, Machine.model == model))
            m = r.scalar_one_or_none()
            if m:
                m.year = year
            else:
                m = Machine(brand=brand, model=model, year=year)
                db.add(m)
            await db.flush()
            machine_by_model[model] = m.id
        print("Upserted machines (John Deere 8R 340, S700)")

        # --- Products (upsert by article_number) ---
        product_by_article = {}
        for p in PRODUCTS:
            r = await db.execute(select(Product).where(Product.article_number == p["article_number"]))
            prod = r.scalar_one_or_none()
            cat_id = category_by_slug.get(p["category_slug"])
            machine_models = p.get("machine_models") or []
            if prod:
                prod.name = p["name"]
                prod.price = p["price_kzt"]
                prod.category_id = cat_id
                prod.status = p["status"]
                prod.vendor_id = admin_user.id
                prod.stock_quantity = prod.stock_quantity if prod.stock_quantity else (10 if p["status"] == ProductStatus.in_stock else 0)
            else:
                prod = Product(
                    vendor_id=admin_user.id,
                    category_id=cat_id,
                    name=p["name"],
                    article_number=p["article_number"],
                    price=p["price_kzt"],
                    stock_quantity=10 if p["status"] == ProductStatus.in_stock else 0,
                    status=p["status"],
                )
                db.add(prod)
            await db.flush()
            product_by_article[p["article_number"]] = prod.id
        print("Upserted products (parts, seeds, fertilizers, SZR)")

        # --- Compatibility matrix: only for parts ---
        seed_product_ids = list(product_by_article.values())
        await db.execute(delete(CompatibilityMatrix).where(CompatibilityMatrix.product_id.in_(seed_product_ids)))
        await db.flush()

        for p in PRODUCTS_PARTS:
            product_id = product_by_article.get(p["article_number"])
            if product_id is None:
                continue
            for model in p.get("machine_models") or []:
                machine_id = machine_by_model.get(model)
                if machine_id is not None:
                    db.add(CompatibilityMatrix(product_id=product_id, machine_id=machine_id))
        await db.flush()
        print("Upserted compatibility matrix (parts only)")

        await db.commit()
    print("Seed done.")


if __name__ == "__main__":
    asyncio.run(seed())
