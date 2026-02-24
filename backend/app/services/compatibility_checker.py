"""AI agent: verify if a generic part is suitable for a specific machine (e.g. John Deere)."""
import json
import re

from pydantic import BaseModel

from app.config import settings
from app.services.llm_client import get_openai_client
from app.services.llm_logging import create_completion_logged

COMPATIBILITY_SYSTEM_PROMPT = """You are an expert in agricultural equipment parts compatibility (e.g. John Deere, CASE, CLAAS). Given a product (name and optional description) and a specific machine (brand, model, year), determine whether the part is suitable for that machine.

Consider: battery capacity/type, oil specs (viscosity, volume), filter dimensions, fitment notes, OEM cross-references. If the product description mentions brands or models, check if they include the given machine.

Reply with a single JSON object only, no markdown: {"compatible": true|false, "confidence": 0.0-1.0, "reason": "explanation"}.
- compatible: true if the part is suitable, false if not suitable, or when uncertain use false and explain in reason.
- confidence: how sure you are (0.0 to 1.0).
- reason: always in Russian. If compatible: write 1–2 sentences in a recommendation style, e.g. "[Товар] рекомендован для [тип техники/бренд], включая [серия/модели], что делает его подходящим для [конкретная машина пользователя]." If not compatible: briefly explain why the part is not recommended or unclear."""


class CompatibilityVerification(BaseModel):
    compatible: bool
    confidence: float
    reason: str


async def verify_compatibility(
    product_name: str,
    product_description: str | None,
    machine_brand: str,
    machine_model: str,
    machine_year: int | None,
) -> CompatibilityVerification:
    """Use LLM to verify if the part is suitable for the given machine."""
    client = get_openai_client()
    if not client:
        return CompatibilityVerification(
            compatible=False,
            confidence=0.0,
            reason="Compatibility check unavailable (no API key).",
        )

    machine_desc = f"{machine_brand} {machine_model}"
    if machine_year is not None:
        machine_desc += f" ({machine_year})"
    desc_part = (product_description or "").strip()
    user_content = f"Product: {product_name}. Description: {desc_part or 'N/A'}. Machine: {machine_desc}. Is this part suitable? Reply with JSON: compatible, confidence, reason."

    try:
        model = getattr(settings, "openai_tool_model", None) or settings.openai_model
        resp = await create_completion_logged(
            client,
            "compatibility",
            model=model,
            messages=[
                {"role": "system", "content": COMPATIBILITY_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
        text = (resp.choices[0].message.content or "{}").strip()
        text = re.sub(r"^```\w*\n?", "", text).replace("```", "").strip()
        data = json.loads(text)
    except (json.JSONDecodeError, KeyError, TypeError):
        return CompatibilityVerification(
            compatible=False,
            confidence=0.0,
            reason="Could not parse compatibility result.",
        )
    except Exception:
        return CompatibilityVerification(
            compatible=False,
            confidence=0.0,
            reason="Service temporarily unavailable.",
        )

    if not isinstance(data, dict):
        return CompatibilityVerification(compatible=False, confidence=0.0, reason="Invalid response.")

    compatible = bool(data.get("compatible", False))
    try:
        confidence = float(data.get("confidence", 0))
    except (TypeError, ValueError):
        confidence = 0.0
    confidence = max(0.0, min(1.0, confidence))
    reason = str(data.get("reason") or "").strip() or "No reason provided."

    return CompatibilityVerification(compatible=compatible, confidence=confidence, reason=reason)
