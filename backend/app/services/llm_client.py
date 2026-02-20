"""Shared OpenAI async client; returns None if API key is not set."""
import httpx
from openai import AsyncOpenAI
from app.config import settings


def get_openai_client() -> AsyncOpenAI | None:
    if not settings.openai_api_key:
        return None
    # Свой httpx-клиент без proxies — обход бага openai + httpx (proxies в 0.26/0.28)
    http_client = httpx.AsyncClient(timeout=60.0)
    return AsyncOpenAI(api_key=settings.openai_api_key, http_client=http_client)
