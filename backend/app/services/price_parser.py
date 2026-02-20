"""AI agent: normalize vendor price list Excel -> map columns via LLM, parse and save."""
import json
import io
from typing import Any

import pandas as pd
from pydantic import BaseModel
from rapidfuzz import fuzz, process

from app.config import settings
from app.services.llm_client import get_openai_client

# Standard catalog fields we want to map from Excel
STANDARD_FIELDS = ("article_number", "name", "price", "quantity")

# Fallback mapping when LLM is unavailable or fails
DEFAULT_MAPPING: dict[str, int | str] = {
    "article_number": 0,
    "name": 1,
    "price": 2,
    "quantity": 3,
}
DEFAULT_CONFIDENCE = {f: 0.5 for f in STANDARD_FIELDS}


class ColumnMappingResult(BaseModel):
    """Result of LLM column mapping: mapping and per-field confidence scores."""

    mapping: dict[str, int | str]
    confidence: dict[str, float]


SYSTEM_PROMPT = """You are an expert at mapping Excel columns to standard fields for an agro parts catalog.
The Excel may have messy or unstructured headers: merged cells, multiple header rows, or noisy names in any language (e.g. "Артикул", "Код", "Part No", "Наименование", "Цена", "Price", "Количество", "Qty").
Standard fields to map (use these exact keys):
- article_number: part number / article code
- name: product or part name
- price: numeric price
- quantity: stock quantity (optional)

You will receive a JSON array of sample rows. Each row is an object with column names as keys.
Reply with a single JSON object only, no markdown. It must have two keys:
1) "mapping": object mapping each standard field to either a 0-based column index (int) or the exact column name (string). Omit a field if not found.
2) "confidence": object mapping each standard field you identified to a number from 0.0 to 1.0 (how sure you are). Example: {"article_number": 0.95, "name": 0.8, "price": 0.9}

Example reply:
{"mapping": {"article_number": 0, "name": 1, "price": 2, "quantity": 3}, "confidence": {"article_number": 0.95, "name": 0.85, "price": 0.9, "quantity": 0.7}}
Use integer indices when columns are in order; use column name strings when headers are named and you reference them by name."""


async def get_column_mapping_from_llm(sample_rows: list[dict]) -> ColumnMappingResult:
    """Ask LLM to map Excel columns to standard fields; return mapping and per-field confidence."""
    client = get_openai_client()
    if not client:
        return ColumnMappingResult(mapping=DEFAULT_MAPPING.copy(), confidence=DEFAULT_CONFIDENCE.copy())

    prompt = json.dumps(sample_rows[:15], ensure_ascii=False)
    try:
        resp = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0,
        )
        text = resp.choices[0].message.content or "{}"
        text = text.strip().replace("```json", "").replace("```", "").strip()
        data = json.loads(text)
    except (json.JSONDecodeError, KeyError, TypeError):
        return ColumnMappingResult(mapping=DEFAULT_MAPPING.copy(), confidence=DEFAULT_CONFIDENCE.copy())

    mapping_raw = data.get("mapping") if isinstance(data, dict) else None
    confidence_raw = data.get("confidence") if isinstance(data, dict) else None

    mapping: dict[str, int | str] = {}
    if isinstance(mapping_raw, dict):
        for k in STANDARD_FIELDS:
            if k in mapping_raw and mapping_raw[k] is not None:
                v = mapping_raw[k]
                if isinstance(v, (int, str)):
                    mapping[k] = v
    if not mapping:
        mapping = DEFAULT_MAPPING.copy()

    confidence: dict[str, float] = {}
    if isinstance(confidence_raw, dict):
        for k in STANDARD_FIELDS:
            if k in confidence_raw and isinstance(confidence_raw[k], (int, float)):
                c = float(confidence_raw[k])
                confidence[k] = max(0.0, min(1.0, c))
    for k in STANDARD_FIELDS:
        if k not in confidence:
            confidence[k] = 0.5

    return ColumnMappingResult(mapping=mapping, confidence=confidence)


# Common part-name terms for fuzzy matching when LLM is unsure about the name column
_FUZZY_PART_TERMS = [
    "filter", "фильтр", "gasket", "прокладка", "seal", "сальник", "oil", "масло",
    "belt", "ремень", "bearing", "подшипник", "brush", "щетка", "blade", "лезвие",
    "spark plug", "свеча", "hose", "шланг", "clamp", "хомуты", "belt", "belt",
]


def _fuzzy_best_match(name: str, choices: list[str], score_cutoff: int = 60) -> tuple[str, int] | None:
    """Return (best_match, score) or None."""
    if not name or not choices:
        return None
    result = process.extractOne(name, choices, scorer=fuzz.ratio, score_cutoff=score_cutoff)
    if not result:
        return None
    return (result[0], result[1])


def _is_noisy_name(name: str) -> bool:
    """True if the name looks like a code or very short/noisy value, not a proper product name."""
    s = name.strip()
    if len(s) > 25:
        return False
    if len(s) <= 3:
        return True
    digit_ratio = sum(1 for c in s if c.isdigit()) / max(len(s), 1)
    if digit_ratio > 0.5:
        return True
    word_count = len(s.split())
    return word_count <= 1 and len(s) <= 15


def apply_fuzzy_name_correction(
    rows: list[dict[str, Any]],
    confidence: dict[str, float],
    known_part_names: list[str] | None = None,
    name_confidence_threshold: float = 0.7,
) -> list[dict[str, Any]]:
    """When name confidence is below threshold, correct only noisy/short names via fuzzy match.
    Do not replace meaningful vendor names with generic terms from _FUZZY_PART_TERMS."""
    if confidence.get("name", 1.0) >= name_confidence_threshold:
        return rows
    known = list(known_part_names) if known_part_names else []
    generic_terms = _FUZZY_PART_TERMS
    out = []
    for item in rows:
        name = item.get("name")
        if not isinstance(name, str) or not name.strip():
            out.append(item)
            continue
        best_known = _fuzzy_best_match(name, known) if known else None
        best_generic = _fuzzy_best_match(name, generic_terms)
        if best_known and best_known[1] >= 70:
            item = {**item, "name": best_known[0]}
        elif best_generic and best_generic[0] != name and _is_noisy_name(name):
            item = {**item, "name": best_generic[0]}
        out.append(item)
    return out


def parse_excel_with_mapping(content: bytes, mapping: dict[str, int | str]) -> list[dict[str, Any]]:
    """Parse Excel bytes using the given column mapping (field -> index or column name)."""
    df = pd.read_excel(io.BytesIO(content), header=0)
    cols = list(df.columns)
    out = []
    for _, row in df.iterrows():
        item: dict[str, Any] = {}
        for field, col in mapping.items():
            if isinstance(col, int) and col < len(cols):
                val = row.iloc[col]
            elif isinstance(col, str) and col in cols:
                val = row[col]
            else:
                continue
            if pd.isna(val):
                continue
            if field == "article_number":
                item[field] = str(val).strip()
            elif field == "name":
                item[field] = str(val).strip() if pd.notna(val) else ""
            elif field == "price":
                try:
                    item[field] = float(val)
                except (TypeError, ValueError):
                    continue
            elif field == "quantity":
                try:
                    item[field] = int(float(val))
                except (TypeError, ValueError):
                    item[field] = 0
        if item.get("article_number") and item.get("name") is not None:
            out.append(item)
    return out
