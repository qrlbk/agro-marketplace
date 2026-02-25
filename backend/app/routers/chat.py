"""Chat assistant endpoint: POST /chat/message (optional auth). Uses live catalog context and user garage."""
import hashlib
import json
from urllib.parse import urlencode

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.garage import Garage
from app.models.machine import Machine
from app.models.category import Category
from app.dependencies import get_current_user_optional
from app.services.chat_assistant import get_assistant_reply, stream_assistant_reply, _normalize_history
from app.services.catalog_context import build_catalog_context, get_products_snippet, resolve_category_by_query
from app.services.search_suggest import get_search_suggestions
from app.services.redis_client import cache_get, cache_set

router = APIRouter()

# Slug раздела «Запчасти и техника» — подставляем category в ссылку только когда запрос про технику
PARTS_CATEGORY_SLUG = "zapchasti-tehnika"

# Ключевые слова запроса «про запчасти/технику» — только тогда подставляем machine_id + категория Запчасти
PARTS_INTENT_KEYWORDS = (
    "запчасти",
    "для моей техники",
    "для трактора",
    "для машины",
    "для техники",
    "совместим",
    "под мою технику",
    "запчасти для",
    "запчасти к",
    "запчасти на",
    "запчасти к технике",
    "моей техники",
    "моему трактору",
    "моей машине",
)

# Вопросные начала — не использовать полный текст как поисковый запрос в ссылке
QUESTION_PREFIXES = ("как ", "что ", "где ", "какие ", "покажи ", "есть ли ", "подскажи ", "найди ")


def _is_parts_intent(message: str) -> bool:
    """True if the user is asking about parts for their machine (garage), not e.g. fertilizers or seeds."""
    if not (message or "").strip():
        return False
    msg_lower = (message or "").strip().lower()
    return any(kw in msg_lower for kw in PARTS_INTENT_KEYWORDS)


class ChatHistoryItem(BaseModel):
    role: str
    content: str


class ChatMessageIn(BaseModel):
    message: str
    history: list[ChatHistoryItem] = []


class ChatMessageOut(BaseModel):
    reply: str
    suggested_catalog_url: str | None = None


async def _get_user_context(db: AsyncSession, user: User | None) -> tuple[str, int | None]:
    """Return (user_context_string, machine_id or None). Includes garage (first machine) and user region."""
    if not user:
        return "", None
    parts: list[str] = []
    machine_id: int | None = None
    result = await db.execute(
        select(Garage, Machine.brand, Machine.model, Machine.year)
        .join(Machine, Garage.machine_id == Machine.id)
        .where(Garage.user_id == user.id)
        .limit(1)
    )
    row = result.first()
    if row:
        garage, brand, model, year = row
        desc = f"{brand} {model}" + (f" ({year})" if year else "")
        parts.append(f"У пользователя в гараже: {desc}. Для фильтра каталога использовать machine_id={garage.machine_id}.")
        machine_id = garage.machine_id
    if user.region and str(user.region).strip():
        parts.append(f"Регион пользователя: {user.region.strip()}.")
    ctx = " ".join(parts)
    return ctx, machine_id


def _chat_cache_key(history_dicts: list[dict], message: str, catalog_context: str, products_snippet: str, user_context: str) -> str:
    """Deterministic cache key for chat reply (same context => same key)."""
    normalized = _normalize_history(history_dicts)
    raw = json.dumps(
        [normalized, (message or "").strip(), catalog_context, products_snippet, user_context],
        sort_keys=False,
        ensure_ascii=False,
    )
    return f"chat:{hashlib.sha256(raw.encode()).hexdigest()}"


@router.post("/message", response_model=ChatMessageOut)
async def chat_message(
    body: ChatMessageIn,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """Get assistant reply with catalog context, product search, optional user garage, and suggested catalog link."""
    history_dicts = [{"role": h.role, "content": h.content} for h in body.history]
    catalog_context = await build_catalog_context(db, include_product_counts=True)
    user_context, machine_id = await _get_user_context(db, current_user)

    search_query = (body.message or "").strip()[:100]
    search_terms: list[str] | None = None
    if search_query and len(search_query) >= 2:
        try:
            suggest = await get_search_suggestions(search_query)
            search_terms = suggest.expanded_terms[:6] if suggest.expanded_terms else [search_query]
        except Exception:
            search_terms = [search_query]
    elif search_query:
        search_terms = [search_query]

    products_snippet = await get_products_snippet(
        db,
        q=search_query or None,
        search_terms=search_terms,
        machine_id=machine_id,
        limit=15,
    )

    cache_key = _chat_cache_key(
        history_dicts, body.message or "", catalog_context, products_snippet, user_context
    )
    cached = await cache_get(cache_key)
    if isinstance(cached, dict) and "reply" in cached:
        reply = cached["reply"]
    else:
        reply = await get_assistant_reply(
            body.message,
            history_dicts,
            catalog_context=catalog_context,
            products_snippet=products_snippet,
            user_context=user_context,
        )
        await cache_set(cache_key, {"reply": reply})

    # Ссылка в каталог: только при запросе про запчасти/технику подставляем machine_id + Запчасти;
    # иначе разрешаем категорию по тексту (удобрения, семена и т.д.) или fallback с q.
    msg_lower = (search_query or "").strip().lower()
    is_question = "?" in (body.message or "") or any(msg_lower.startswith(p) for p in QUESTION_PREFIXES)

    if _is_parts_intent(body.message or "") and machine_id is not None:
        params = {"machine_id": str(machine_id)}
        cat_result = await db.execute(
            select(Category.id).where(Category.slug == PARTS_CATEGORY_SLUG).limit(1)
        )
        row = cat_result.first()
        if row:
            params["category"] = str(row[0])
        suggested_catalog_url = "/catalog?" + urlencode(params)
    else:
        resolved_category_id = await resolve_category_by_query(db, search_query or (body.message or ""))
        if resolved_category_id is not None:
            suggested_catalog_url = "/catalog?" + urlencode({"category": str(resolved_category_id)})
        else:
            params = {}
            if search_query and not is_question:
                params["q"] = search_query
            suggested_catalog_url = "/catalog?" + urlencode(params) if params else "/catalog"

    return ChatMessageOut(reply=reply, suggested_catalog_url=suggested_catalog_url)


@router.post("/message/stream")
async def chat_message_stream(
    body: ChatMessageIn,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """Stream assistant reply as Server-Sent Events. Each event: data: {\"content\": \"...\"} or data: {\"done\": true, \"suggested_catalog_url\": \"...\"}."""
    history_dicts = [{"role": h.role, "content": h.content} for h in body.history]
    catalog_context = await build_catalog_context(db, include_product_counts=True)
    user_context, machine_id = await _get_user_context(db, current_user)

    search_query = (body.message or "").strip()[:100]
    search_terms: list[str] | None = None
    if search_query and len(search_query) >= 2:
        try:
            suggest = await get_search_suggestions(search_query)
            search_terms = suggest.expanded_terms[:6] if suggest.expanded_terms else [search_query]
        except Exception:
            search_terms = [search_query]
    elif search_query:
        search_terms = [search_query]

    products_snippet = await get_products_snippet(
        db,
        q=search_query or None,
        search_terms=search_terms,
        machine_id=machine_id,
        limit=15,
    )

    msg_lower = (search_query or "").strip().lower()
    is_question = "?" in (body.message or "") or any(msg_lower.startswith(p) for p in QUESTION_PREFIXES)

    if _is_parts_intent(body.message or "") and machine_id is not None:
        params = {"machine_id": str(machine_id)}
        cat_result = await db.execute(
            select(Category.id).where(Category.slug == PARTS_CATEGORY_SLUG).limit(1)
        )
        row = cat_result.first()
        if row:
            params["category"] = str(row[0])
        suggested_catalog_url = "/catalog?" + urlencode(params)
    else:
        resolved_category_id = await resolve_category_by_query(db, search_query or (body.message or ""))
        if resolved_category_id is not None:
            suggested_catalog_url = "/catalog?" + urlencode({"category": str(resolved_category_id)})
        else:
            params = {}
            if search_query and not is_question:
                params["q"] = search_query
            suggested_catalog_url = "/catalog?" + urlencode(params) if params else "/catalog"

    async def event_stream():
        async for chunk in stream_assistant_reply(
            body.message,
            history_dicts,
            catalog_context=catalog_context,
            products_snippet=products_snippet,
            user_context=user_context,
        ):
            yield f"data: {json.dumps({'content': chunk})}\n\n"
        yield f"data: {json.dumps({'done': True, 'suggested_catalog_url': suggested_catalog_url})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
