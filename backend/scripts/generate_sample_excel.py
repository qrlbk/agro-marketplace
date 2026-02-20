"""
Генерация синтетических Excel-прайсов для тестирования загрузки (vendor upload).
Создаёт 2 файла в backend/scripts/sample_data/:
- pricelist_ru.xlsx — большой прайс с русскими заголовками (Артикул, Наименование, Цена, Количество)
- pricelist_messy.xlsx — вариант с «шумными» заголовками для проверки LLM-маппинга
"""
from pathlib import Path
import random

try:
    import pandas as pd
except ImportError:
    raise SystemExit("Установите pandas: pip install pandas openpyxl")

OUTPUT_DIR = Path(__file__).resolve().parent / "sample_data"
NUM_ROWS = 450  # достаточно большой объём для проверки

# Шаблоны товаров: (название с одним {}, префикс артикула, мин-макс цена KZT, (мин_кол-во, макс_кол-во))
TEMPLATES = [
    ("Фильтр масляный {} (запчасть)", "FLT-OIL", 12000, 45000, (5, 80)),
    ("Топливный фильтр {}", "FLT-FUEL", 18000, 35000, (0, 120)),
    ("Воздушный фильтр {}", "FLT-AIR", 8000, 28000, (2, 60)),
    ("Фильтр гидравлический {} (гидравлика)", "FLT-HYD", 22000, 48000, (1, 40)),
    ("Фильтр салона/кабины {}", "FLT-CAB", 5000, 18000, (3, 90)),
    ("Ремень генератора {}", "BLT-GEN", 15000, 55000, (0, 25)),
    ("Ремень привода жатки {}", "BLT-HARV", 18000, 42000, (1, 30)),
    ("Свеча накаливания {}", "GPR", 4500, 12000, (4, 100)),
    ("Сегмент ножа жатки {}", "SN", 8000, 22000, (2, 50)),
    ("Подшипник шнека {}", "BS", 12000, 35000, (0, 45)),
    ("Палец шнека {}", "PS", 5000, 15000, (5, 80)),
    ("Масло моторное 15W-40 {} (канистра)", "TMS", 35000, 85000, (10, 200)),
    ("Масло гидравлическое {}", "THF", 28000, 72000, (5, 100)),
    ("Смазка литиевая {}", "GRS", 800, 4500, (20, 500)),
    ("Пшеница озимая сорт {}", "SEM-WHT", 45000, 120000, (100, 5000)),
    ("Ячмень сорт {}", "SEM-BAR", 35000, 95000, (50, 3000)),
    ("Подсолнечник гибрид {}", "SEM-SUN", 80000, 180000, (20, 800)),
    ("Рапс озимый сорт {}", "SEM-RAP", 65000, 140000, (10, 500)),
    ("Кукуруза гибрид {}", "SEM-CRN", 55000, 130000, (30, 1500)),
    ("Горох сорт {}", "SEM-PEA", 40000, 90000, (40, 2000)),
    ("Аммиачная селитра 34,4% (мешок 50 кг)", "FERT-AN", 15000, 22000, (20, 500)),
    ("НПК 16:16:16 (мешок 50 кг)", "FERT-NPK", 18000, 26000, (15, 400)),
    ("Карбамид (мешок 50 кг)", "FERT-UREA", 22000, 32000, (10, 300)),
    ("Навоз конский перепревший (биг-бэг)", "FERT-MAN", 35000, 55000, (0, 50)),
    ("Компост органический (палета)", "FERT-COMP", 90000, 150000, (0, 20)),
    ("Суперфосфат простой (мешок 50 кг)", "FERT-SUP", 12000, 18000, (5, 200)),
    ("Гербицид сплошного действия (канистра)", "SZR-HERB", 25000, 45000, (0, 80)),
    ("Гербицид против злаковых (флакон)", "SZR-HERB-G", 12000, 22000, (5, 120)),
    ("Инсектицид контактно-кишечный {}", "SZR-INS", 5000, 18000, (0, 200)),
    ("Инсектицид системный (канистра 10 л)", "SZR-INS-S", 35000, 55000, (0, 50)),
    ("Фунгицид {}", "SZR-FUN", 18000, 42000, (2, 60)),
]

MODELS = ["8R 340", "S700", "S660", "6M 140", "7R 250", "9R 540"]
BRANDS = ["John Deere", "Case IH", "CLAAS", "New Holland"]
SEED_VARIANTS = ["Казахстанская 10", "Омский 90", "Тунка", "Лира", "Саратовская 7", "Астана", "Корона"]


def generate_row(i: int) -> dict:
    template = random.choice(TEMPLATES)
    name_tpl, art_prefix, pmin, pmax, qty_range = template
    article = f"{art_prefix}-{i:05d}"

    if "{}" in name_tpl:
        if "SEM-" in art_prefix or "SEM-" in name_tpl:
            name = name_tpl.format(random.choice(SEED_VARIANTS))
        else:
            name = name_tpl.format(random.choice(MODELS + BRANDS))
    else:
        name = name_tpl

    price = random.randint(pmin, pmax)
    if random.random() < 0.15:
        price = round(price / 1000) * 1000
    qty = random.randint(qty_range[0], qty_range[1])
    return {"Артикул": article, "Наименование": name, "Цена": price, "Количество": qty}


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    rows = [generate_row(i) for i in range(1, NUM_ROWS + 1)]
    df_ru = pd.DataFrame(rows)

    # 1) Прайс с русскими заголовками (стандартный)
    path_ru = OUTPUT_DIR / "pricelist_ru.xlsx"
    df_ru.to_excel(path_ru, index=False, sheet_name="Прайс-лист")
    print(f"Создан: {path_ru} ({len(df_ru)} строк)")

    # 2) Вариант с «шумными» заголовками (как у реальных поставщиков) — для проверки маппинга LLM
    df_messy = df_ru.copy()
    df_messy.columns = ["Код товара / Part No", "Наименование товара", "Цена, ₸", "Остаток (шт.)"]
    path_messy = OUTPUT_DIR / "pricelist_messy.xlsx"
    df_messy.to_excel(path_messy, index=False, sheet_name="Price list")
    print(f"Создан: {path_messy} ({len(df_messy)} строк)")

    # 3) Дополнительно: вариант без колонки «Артикул» — часть строк без артикула (проверка автогенерации)
    df_partial = df_ru.copy()
    # У 30% строк убираем артикул
    for idx in random.sample(range(len(df_partial)), k=min(135, len(df_partial) // 3)):
        df_partial.at[idx, "Артикул"] = ""
    path_partial = OUTPUT_DIR / "pricelist_partial_articles.xlsx"
    df_partial.to_excel(path_partial, index=False, sheet_name="Прайс")
    print(f"Создан: {path_partial} ({len(df_partial)} строк, часть без артикула — проверка автогенерации)")

    print("\nГотово. Загружайте файлы через «Прайс-лист» в кабинете продавца.")


if __name__ == "__main__":
    main()
