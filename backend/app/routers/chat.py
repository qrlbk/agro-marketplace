"""Chat assistant endpoint: POST /chat/message (no auth required). Uses live catalog context."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.services.chat_assistant import get_assistant_reply
from app.services.catalog_context import build_catalog_context, get_products_snippet

router = APIRouter()

# Ключевые слова, при которых подгружаем срез товаров в контекст
PRODUCT_QUERY_KEYWORDS = ("какие", "семена", "запчасти", "товары", "покажи", "что есть", "список", "есть ли", "найди")


class ChatHistoryItem(BaseModel):
    role: str
    content: str


class ChatMessageIn(BaseModel):
    message: str
    history: list[ChatHistoryItem] = []


class ChatMessageOut(BaseModel):
    reply: str


@router.post("/message", response_model=ChatMessageOut)
async def chat_message(
    body: ChatMessageIn,
    db: AsyncSession = Depends(get_db),
):
    """Get assistant reply with real-time catalog structure and optional product snippet."""
    history_dicts = [{"role": h.role, "content": h.content} for h in body.history]
    catalog_context = await build_catalog_context(db, include_product_counts=True)
    products_snippet = ""
    msg_lower = (body.message or "").strip().lower()
    if any(kw in msg_lower for kw in PRODUCT_QUERY_KEYWORDS):
        products_snippet = await get_products_snippet(db, q=body.message.strip()[:80] if body.message else None, limit=15)
    reply = await get_assistant_reply(
        body.message,
        history_dicts,
        catalog_context=catalog_context,
        products_snippet=products_snippet,
    )
    return ChatMessageOut(reply=reply)
