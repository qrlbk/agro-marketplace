"""Chat assistant for the whole marketplace: all catalogs (seeds, parts, etc.) with real-time catalog context."""
import logging

from app.config import settings
from app.services.llm_client import get_openai_client

logger = logging.getLogger(__name__)

MAX_HISTORY_PAIRS = 10
UNAVAILABLE_MESSAGE = "Помощник временно недоступен. Попробуйте позже."

SYSTEM_PROMPT_BASE = """You are a helpful assistant for an agricultural marketplace. You help with ALL sections of the catalog: seeds, spare parts, equipment, maintenance, compatibility, and any other categories listed below. You are NOT an official consultant. Your answers are for reference only and may be inaccurate; the user is responsible for their own decisions about purchases and compatibility.

In the catalog, users can: filter by category, filter by machine (garage), sort (by default, by price ascending/descending, by name A–Z / Z–A). Suggest how to open the right section and use sorting/filters when relevant.

Use the same language as the user (Russian or Kazakh when they write in those languages). Keep answers concise and practical. When you mention products or categories, use the structure below."""


def _build_system_content(catalog_context: str, products_snippet: str) -> str:
    parts = [SYSTEM_PROMPT_BASE, ""]
    if catalog_context:
        parts.append("Актуальная структура каталога (на момент запроса):")
        parts.append(catalog_context)
    else:
        parts.append("Каталог временно недоступен — отвечай в общем, предлагай перейти в каталог или связаться с продавцом.")
    if products_snippet:
        parts.append("")
        parts.append("Если ниже дан список товаров — можешь перечислять их, предлагать сортировку по цене или названию в каталоге и направлять в нужный раздел.")
        parts.append("")
        parts.append(products_snippet)
    return "\n".join(parts)


def _normalize_history(history: list[dict]) -> list[dict]:
    """Keep only the last MAX_HISTORY_PAIRS user/assistant pairs, as OpenAI message format."""
    out = []
    pairs = 0
    for i in range(len(history) - 1, -1, -1):
        if pairs >= MAX_HISTORY_PAIRS:
            break
        msg = history[i]
        role = (msg.get("role") or "").strip().lower()
        content = (msg.get("content") or "").strip()
        if role not in ("user", "assistant") or not content:
            continue
        out.insert(0, {"role": role, "content": content})
        if role == "user":
            pairs += 1
    return out


async def get_assistant_reply(
    user_message: str,
    history: list[dict],
    catalog_context: str = "",
    products_snippet: str = "",
) -> str:
    """Return assistant reply. catalog_context and products_snippet are built from live DB for this request."""
    client = get_openai_client()
    if not client:
        logger.warning("Chat assistant: OPENAI_API_KEY is not set or empty")
        return UNAVAILABLE_MESSAGE

    message_text = (user_message or "").strip()
    if not message_text:
        return "Напишите, пожалуйста, ваш вопрос."

    normalized = _normalize_history(history)
    system_content = _build_system_content(catalog_context, products_snippet)
    messages: list[dict[str, str]] = [
        {"role": "system", "content": system_content},
        *normalized,
        {"role": "user", "content": message_text},
    ]

    try:
        resp = await client.chat.completions.create(
            model=settings.openai_model,
            messages=messages,
            temperature=0.4,
        )
        reply = (resp.choices[0].message.content or "").strip()
        return reply or UNAVAILABLE_MESSAGE
    except Exception as e:
        logger.exception("Chat assistant OpenAI call failed: %s", e)
        return UNAVAILABLE_MESSAGE
