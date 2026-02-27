"""BIN lookup via external API (e.g. Adata.kz). Never raises — returns empty result on failure."""

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

BIN_CACHE_PREFIX = "bin:"
BIN_CACHE_TTL = 48 * 3600  # 48 hours


def _normalize_bin(bin_str: str) -> str:
    return (bin_str or "").strip().replace(" ", "")


async def lookup_bin(bin_str: str) -> dict[str, Any]:
    """
    Look up company data by BIN. Returns dict with name, legal_address, chairman_name.
    On any error or missing API key returns empty dict and never raises.
    """
    bin_clean = _normalize_bin(bin_str)
    if not bin_clean or len(bin_clean) < 10:
        return {"name": None, "legal_address": None, "chairman_name": None, "manual_input_required": True}

    if not settings.adata_api_key:
        logger.debug("BIN lookup skipped: no ADATA_API_KEY")
        return {"name": None, "legal_address": None, "chairman_name": None, "manual_input_required": True}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Adata.kz-style endpoint; adjust URL/headers to actual API docs
            url = f"{settings.adata_bin_lookup_url.rstrip('/')}/{bin_clean}"
            resp = await client.get(
                url,
                headers={"Authorization": f"Bearer {settings.adata_api_key}"} if settings.adata_api_key else {},
            )
            if resp.status_code != 200:
                logger.warning("BIN lookup non-200: status=%s body_length=%s", resp.status_code, len(resp.text))
                return {"name": None, "legal_address": None, "chairman_name": None, "manual_input_required": True}
            data = resp.json()
    except Exception as e:
        logger.warning("BIN lookup failed: %s", e)
        return {"name": None, "legal_address": None, "chairman_name": None, "manual_input_required": True}

    # Map common response fields; adapt keys to actual Adata response shape
    name = (data.get("name") or data.get("legal_name") or data.get("company_name")) if isinstance(data, dict) else None
    legal_address = (data.get("legal_address") or data.get("address") or data.get("address_legal")) if isinstance(data, dict) else None
    chairman_name = (data.get("chairman_name") or data.get("director") or data.get("head_fio")) if isinstance(data, dict) else None

    return {
        "name": name,
        "legal_address": legal_address,
        "chairman_name": chairman_name,
        "manual_input_required": not (name or legal_address or chairman_name),
    }
