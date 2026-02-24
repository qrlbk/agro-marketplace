"""Log LLM API calls: model, call type, duration, token usage."""
import logging
import time
from typing import Any

logger = logging.getLogger(__name__)


def _usage_dict(usage: Any) -> dict[str, int] | None:
    if usage is None:
        return None
    d: dict[str, int] = {}
    if getattr(usage, "prompt_tokens", None) is not None:
        d["prompt_tokens"] = usage.prompt_tokens
    if getattr(usage, "completion_tokens", None) is not None:
        d["completion_tokens"] = usage.completion_tokens
    if getattr(usage, "total_tokens", None) is not None:
        d["total_tokens"] = usage.total_tokens
    return d if d else None


async def create_completion_logged(client: Any, call_type: str, **kwargs: Any) -> Any:
    """Call client.chat.completions.create(**kwargs), log model, call_type, duration_sec, usage; return response."""
    model = kwargs.get("model", "?")
    start = time.monotonic()
    try:
        resp = await client.chat.completions.create(**kwargs)
        duration = time.monotonic() - start
        usage = _usage_dict(getattr(resp, "usage", None))
        logger.info(
            "llm_call type=%s model=%s duration_sec=%.2f usage=%s",
            call_type,
            model,
            duration,
            usage,
        )
        return resp
    except Exception as e:
        duration = time.monotonic() - start
        logger.warning(
            "llm_call type=%s model=%s duration_sec=%.2f error=%s",
            call_type,
            model,
            duration,
            str(e),
        )
        raise


def log_llm_stream_done(call_type: str, model: str, duration_sec: float) -> None:
    """Log completion of a streaming call (no token usage available from stream)."""
    logger.info(
        "llm_stream_done type=%s model=%s duration_sec=%.2f",
        call_type,
        model,
        duration_sec,
    )
