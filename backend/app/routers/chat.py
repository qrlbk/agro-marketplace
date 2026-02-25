"""Chat assistant endpoint: POST /chat/message (optional auth). Uses live catalog context and user garage."""
import hashlib
import json
from dataclasses import dataclass
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel

from app.database import get_db, async_session_maker
from app.models.user import User
from app.models.garage import Garage
from app.models.chat_feedback import ChatFeedback
from app.models.chat_session import ChatSession, ChatMessage as ChatMessageRow
from app.models.machine import Machine
from app.models.category import Category
from app.dependencies import get_current_user_optional, get_current_user, check_chat_rate_limit
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


def _suggested_follow_ups(suggested_catalog_url: str, search_query: str) -> list[str]:
    """Return 2-3 suggested follow-up questions for quick replies."""
    suggestions = [
        "Показать другие категории",
        "Как проверить совместимость?",
    ]
    if search_query and "запчаст" not in search_query.lower():
        suggestions.append("Найти запчасти для моей техники")
    return suggestions[:3]


@dataclass
class PreparedChatContext:
    """Result of _prepare_chat_context: everything needed to get reply and suggested_catalog_url."""
    history_dicts: list[dict]
    catalog_context: str
    user_context: str
    machine_id: int | None
    products_snippet: str
    search_query: str
    suggested_catalog_url: str


class ChatHistoryItem(BaseModel):
    role: str
    content: str


class ChatMessageIn(BaseModel):
    message: str
    history: list[ChatHistoryItem] = []


class ChatMessageOut(BaseModel):
    reply: str
    suggested_catalog_url: str | None = None
    suggested_follow_ups: list[str] = []


class ChatFeedbackIn(BaseModel):
    message_id: str
    is_positive: bool


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


CATALOG_CONTEXT_CACHE_KEY = "catalog:context:tree"
CATALOG_CONTEXT_TTL = 600  # 10 min

async def _prepare_chat_context(
    body: ChatMessageIn,
    db: AsyncSession,
    current_user: User | None,
) -> PreparedChatContext:
    """Build history, catalog context, user context, products snippet, and suggested_catalog_url in one place."""
    history_dicts = [{"role": h.role, "content": h.content} for h in body.history]
    cached_catalog = await cache_get(CATALOG_CONTEXT_CACHE_KEY)
    catalog_context = cached_catalog.get("v") if isinstance(cached_catalog, dict) and "v" in cached_catalog else None
    if not catalog_context:
        catalog_context = await build_catalog_context(db, include_product_counts=True)
        await cache_set(CATALOG_CONTEXT_CACHE_KEY, {"v": catalog_context}, ttl=CATALOG_CONTEXT_TTL)
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

    return PreparedChatContext(
        history_dicts=history_dicts,
        catalog_context=catalog_context,
        user_context=user_context,
        machine_id=machine_id,
        products_snippet=products_snippet,
        search_query=search_query,
        suggested_catalog_url=suggested_catalog_url,
    )


async def _persist_chat_turn(
    user_id: int,
    user_message: str,
    assistant_reply: str,
    suggested_catalog_url: str | None,
) -> None:
    """Save user message and assistant reply to the user's latest chat session (new session if none)."""
    async with async_session_maker() as db:
        result = await db.execute(
            select(ChatSession).where(ChatSession.user_id == user_id).order_by(desc(ChatSession.updated_at)).limit(1)
        )
        session = result.scalar_one_or_none()
        if not session:
            session = ChatSession(user_id=user_id)
            db.add(session)
            await db.flush()
        db.add(
            ChatMessageRow(
                session_id=session.id,
                role="user",
                content=(user_message or "").strip()[:4096],
            )
        )
        db.add(
            ChatMessageRow(
                session_id=session.id,
                role="assistant",
                content=(assistant_reply or "").strip()[:16384],
                suggested_catalog_url=(suggested_catalog_url or "").strip()[:512] or None,
            )
        )
        await db.commit()


def _chat_cache_key(
    history_dicts: list[dict],
    message: str,
    catalog_context: str,
    products_snippet: str,
    user_context: str,
) -> str:
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
    request: Request,
    body: ChatMessageIn,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    _: None = Depends(check_chat_rate_limit),
):
    """Get assistant reply with catalog context, product search, optional user garage, and suggested catalog link."""
    ctx = await _prepare_chat_context(body, db, current_user)

    cache_key = _chat_cache_key(
        ctx.history_dicts,
        body.message or "",
        ctx.catalog_context,
        ctx.products_snippet,
        ctx.user_context,
    )
    cached = await cache_get(cache_key)
    if isinstance(cached, dict) and "reply" in cached:
        reply = cached["reply"]
    else:
        reply = await get_assistant_reply(
            body.message,
            ctx.history_dicts,
            catalog_context=ctx.catalog_context,
            products_snippet=ctx.products_snippet,
            user_context=ctx.user_context,
        )
        await cache_set(cache_key, {"reply": reply})

    if current_user:
        await _persist_chat_turn(
            current_user.id,
            body.message or "",
            reply,
            ctx.suggested_catalog_url,
        )
    follow_ups = _suggested_follow_ups(ctx.suggested_catalog_url, ctx.search_query)
    return ChatMessageOut(
        reply=reply,
        suggested_catalog_url=ctx.suggested_catalog_url,
        suggested_follow_ups=follow_ups,
    )


@router.post("/message/stream")
async def chat_message_stream(
    request: Request,
    body: ChatMessageIn,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    _: None = Depends(check_chat_rate_limit),
):
    """Stream assistant reply as Server-Sent Events. Each event: data: {\"content\": \"...\"} or data: {\"done\": true, \"suggested_catalog_url\": \"...\"}."""
    ctx = await _prepare_chat_context(body, db, current_user)

    async def event_stream():
        reply_text = ""
        cache_key = _chat_cache_key(
            ctx.history_dicts,
            body.message or "",
            ctx.catalog_context,
            ctx.products_snippet,
            ctx.user_context,
        )
        cached = await cache_get(cache_key)
        if isinstance(cached, dict) and "reply" in cached:
            reply = cached["reply"]
            reply_text = reply
            chunk_size = 40
            for i in range(0, len(reply), chunk_size):
                yield f"data: {json.dumps({'content': reply[i:i + chunk_size]})}\n\n"
        else:
            full_reply: list[str] = []
            async for chunk in stream_assistant_reply(
                body.message,
                ctx.history_dicts,
                catalog_context=ctx.catalog_context,
                products_snippet=ctx.products_snippet,
                user_context=ctx.user_context,
            ):
                full_reply.append(chunk)
                yield f"data: {json.dumps({'content': chunk})}\n\n"
            reply_text = "".join(full_reply)
            if full_reply:
                await cache_set(cache_key, {"reply": reply_text})
        if current_user and reply_text:
            await _persist_chat_turn(
                current_user.id,
                body.message or "",
                reply_text,
                ctx.suggested_catalog_url,
            )
        follow_ups = _suggested_follow_ups(ctx.suggested_catalog_url, ctx.search_query)
        yield f"data: {json.dumps({'done': True, 'suggested_catalog_url': ctx.suggested_catalog_url, 'suggested_follow_ups': follow_ups})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/sessions")
async def chat_list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List current user's chat sessions (latest first)."""
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(desc(ChatSession.updated_at))
        .limit(20)
    )
    sessions = result.scalars().all()
    return [
        {"id": s.id, "created_at": s.created_at.isoformat(), "updated_at": s.updated_at.isoformat()}
        for s in sessions
    ]


@router.get("/sessions/{session_id}/messages")
async def chat_get_session_messages(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get messages for a session. Session must belong to current user."""
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    result = await db.execute(
        select(ChatMessageRow).where(ChatMessageRow.session_id == session_id).order_by(ChatMessageRow.created_at)
    )
    messages = result.scalars().all()
    return [
        {
            "role": m.role,
            "content": m.content,
            "suggested_catalog_url": m.suggested_catalog_url,
        }
        for m in messages
    ]


@router.post("/feedback")
async def chat_feedback(
    body: ChatFeedbackIn,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """Record thumbs up/down for a chat message. Optional auth."""
    message_id = (body.message_id or "").strip()[:64]
    if not message_id:
        raise HTTPException(status_code=400, detail="message_id required")
    row = ChatFeedback(
        message_id=message_id,
        user_id=current_user.id if current_user else None,
        is_positive=body.is_positive,
    )
    db.add(row)
    await db.flush()
    return {"ok": True}
