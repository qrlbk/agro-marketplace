"""Shared OpenAI async client; returns None if API key is not set. Singleton to avoid connection leaks."""
import httpx
from openai import AsyncOpenAI
from app.config import settings

_http_client: httpx.AsyncClient | None = None
_openai_client: AsyncOpenAI | None = None


def get_openai_client() -> AsyncOpenAI | None:
    """Return a singleton AsyncOpenAI client. Reuses one httpx.AsyncClient to avoid connection pool exhaustion."""
    global _http_client, _openai_client
    if not settings.openai_api_key:
        return None
    if _openai_client is not None:
        return _openai_client
    timeout = getattr(settings, "openai_timeout_seconds", 60.0)
    _http_client = httpx.AsyncClient(timeout=float(timeout))
    _openai_client = AsyncOpenAI(
        api_key=settings.openai_api_key,
        http_client=_http_client,
    )
    return _openai_client


async def close_openai_client() -> None:
    """Close the shared HTTP client. Call on application shutdown."""
    global _http_client, _openai_client
    if _http_client is not None:
        await _http_client.aclose()
        _http_client = None
    _openai_client = None
