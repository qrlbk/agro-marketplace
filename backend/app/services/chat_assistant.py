"""Chat assistant for the whole marketplace: all catalogs (seeds, parts, etc.) with real-time catalog context."""
import logging
import time
from collections.abc import AsyncGenerator

from app.config import settings
from app.services.llm_client import get_openai_client
from app.services.llm_logging import create_completion_logged, log_llm_stream_done

logger = logging.getLogger(__name__)

MAX_HISTORY_PAIRS = 10
UNAVAILABLE_MESSAGE = "Помощник временно недоступен. Попробуйте позже."

SYSTEM_PROMPT_BASE = """You are a helpful assistant for an agricultural marketplace. You help with ALL sections of the catalog: seeds, spare parts, equipment, maintenance, compatibility, and any other categories listed below. You are NOT an official consultant. Your answers are for reference only and may be inaccurate; the user is responsible for their own decisions about purchases and compatibility.

In the catalog, users can: filter by category, filter by machine (garage), sort (by default, by price ascending/descending, by name A–Z / Z–A). Suggest how to open the right section and use sorting/filters when relevant.

Use the same language as the user (Russian or Kazakh when they write in those languages). Keep answers SHORT and action-oriented: 1–3 sentences, one paragraph, up to 80 words. When recommending products or a section, say that the user can open the catalog with the button below — the app will show a single "Open in catalog" button under your message with the correct link. Do NOT include any URLs or markdown links in your reply (no [text](url), no example.com, no /catalog?...). Write only plain text. If the user has a machine in their garage, personalize: "For your [machine]..." and suggest compatible parts when the question is about parts. If the user's region is provided in context, take it into account when relevant (e.g. delivery, vendors in their region)."""


def _build_system_content(
    catalog_context: str,
    products_snippet: str,
    user_context: str = "",
) -> str:
    parts = [SYSTEM_PROMPT_BASE, ""]
    if user_context:
        parts.append("Контекст пользователя:")
        parts.append(user_context)
        parts.append("")
    if catalog_context:
        parts.append("Актуальная структура каталога (на момент запроса):")
        parts.append(catalog_context)
    else:
        parts.append(
            "Каталог временно недоступен — отвечай в общем, предлагай перейти в каталог или связаться с продавцом."
        )
    if products_snippet:
        parts.append("")
        parts.append(
            "Если ниже дан список товаров — опирайся на него; предлагай переход в каталог с учётом запроса и техники пользователя. Перечисляй конкретные товары или категории и направляй в каталог по ссылке ниже."
        )
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
    user_context: str = "",
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
    system_content = _build_system_content(
        catalog_context, products_snippet, user_context=user_context
    )
    messages: list[dict[str, str]] = [
        {"role": "system", "content": system_content},
        *normalized,
        {"role": "user", "content": message_text},
    ]

    try:
        model = settings.openai_chat_model or settings.openai_model
        resp = await create_completion_logged(
            client,
            "chat",
            model=model,
            messages=messages,
            temperature=0.4,
            max_tokens=settings.openai_chat_max_tokens,
        )
        reply = (resp.choices[0].message.content or "").strip()
        return reply or UNAVAILABLE_MESSAGE
    except Exception as e:
        logger.exception("Chat assistant OpenAI call failed: %s", e)
        return UNAVAILABLE_MESSAGE


async def stream_assistant_reply(
    user_message: str,
    history: list[dict],
    catalog_context: str = "",
    products_snippet: str = "",
    user_context: str = "",
) -> AsyncGenerator[str, None]:
    """Stream assistant reply token by token. Yields content deltas."""
    client = get_openai_client()
    if not client:
        logger.warning("Chat assistant: OPENAI_API_KEY is not set or empty")
        yield UNAVAILABLE_MESSAGE
        return

    message_text = (user_message or "").strip()
    if not message_text:
        yield "Напишите, пожалуйста, ваш вопрос."
        return

    normalized = _normalize_history(history)
    system_content = _build_system_content(
        catalog_context, products_snippet, user_context=user_context
    )
    messages: list[dict[str, str]] = [
        {"role": "system", "content": system_content},
        *normalized,
        {"role": "user", "content": message_text},
    ]

    model = settings.openai_chat_model or settings.openai_model
    start = time.monotonic()
    try:
        stream = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.4,
            max_tokens=settings.openai_chat_max_tokens,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
        log_llm_stream_done("chat_stream", model, time.monotonic() - start)
    except Exception as e:
        logger.exception("Chat assistant OpenAI stream failed: %s", e)
        yield UNAVAILABLE_MESSAGE
