"""AI predictive maintenance: recommend maintenance kits by machine and moto hours."""
import json
import re

from app.config import settings
from app.schemas.maintenance import MaintenanceRecommendation
from app.services.llm_client import get_openai_client
from app.services.llm_logging import create_completion_logged

MAINTENANCE_SYSTEM_PROMPT = """You are an expert in agricultural equipment maintenance. Given a machine (brand, model, year) and its current moto hours (engine/operating hours), recommend maintenance kit items based on typical service intervals.

Common intervals for ag equipment: 250h, 500h, 1000h, 2000h, 5000h (oil changes, oil filter, air filter, fuel filter, cabin filter, grease points, etc.).
Consider the current moto hours and suggest what service is due or coming up (e.g. if at 950h, recommend 1000h service kit).

Reply with a JSON array only, no markdown. Each element: {"interval_h": number or null, "items": ["item1", "item2"], "reason": "brief reason"}.
Write all items and reasons in Russian. Use Russian names for parts: e.g. "Масло моторное 15W-40", "Масляный фильтр", "Воздушный фильтр", "Топливный фильтр", "Фильтр гидравлики", "Фильтр салона".
Example: [{"interval_h": 1000, "items": ["Масляный фильтр", "Масло моторное 10W-40", "Воздушный фильтр"], "reason": "ТО 1000 ч: замена масла и фильтров"}, ...]
Keep 1-4 recommendations, in order of relevance. Use interval_h as the service interval in hours when applicable."""


async def recommend_maintenance_kits(
    machine_brand: str,
    machine_model: str,
    machine_year: int | None,
    moto_hours: int,
) -> list[MaintenanceRecommendation]:
    """Return AI-recommended maintenance kits for the given machine and moto hours."""
    client = get_openai_client()
    if not client:
        return []

    machine_desc = f"{machine_brand} {machine_model}"
    if machine_year is not None:
        machine_desc += f" ({machine_year})"
    user_content = f"Машина: {machine_desc}. Текущие моточасы: {moto_hours}. Дай рекомендации по ТО (фильтры, масла и т.д.) по интервалам. Все названия позиций и причины — только на русском."

    try:
        model = getattr(settings, "openai_tool_model", None) or settings.openai_model
        resp = await create_completion_logged(
            client,
            "maintenance",
            model=model,
            messages=[
                {"role": "system", "content": MAINTENANCE_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0.2,
        )
        text = (resp.choices[0].message.content or "[]").strip()
        text = re.sub(r"^```\w*\n?", "", text).replace("```", "").strip()
        raw = json.loads(text)
    except (json.JSONDecodeError, KeyError, TypeError):
        return []

    if not isinstance(raw, list):
        return []

    out: list[MaintenanceRecommendation] = []
    for item in raw[:6]:
        if not isinstance(item, dict):
            continue
        interval_h = item.get("interval_h")
        if interval_h is not None and not isinstance(interval_h, int):
            try:
                interval_h = int(interval_h)
            except (TypeError, ValueError):
                interval_h = None
        items_raw = item.get("items")
        if isinstance(items_raw, list):
            items = [str(x) for x in items_raw if x]
        else:
            items = []
        reason = str(item.get("reason") or "").strip() or "Recommended for this interval."
        out.append(
            MaintenanceRecommendation(
                interval_h=interval_h,
                items=items,
                reason=reason,
            )
        )
    return out
