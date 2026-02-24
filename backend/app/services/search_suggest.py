"""AI search suggestions: synonyms and related part terms for a query."""
import hashlib
import json
import re

from pydantic import BaseModel

from app.config import settings
from app.services.llm_client import get_openai_client
from app.services.llm_logging import create_completion_logged
from app.services.redis_client import cache_get, cache_set

SUGGEST_CACHE_TTL = 300

SUGGEST_SYSTEM_PROMPT = """You are an expert in agricultural equipment and spare parts terminology. Given a search query (in any language, e.g. "filter", "фильтр", "gasket"), suggest synonyms and related part terms that a buyer might also search for.

Examples: "filter" -> ["gaskets", "seals", "oil filter", "air filter"]; "масло" -> ["oil", "motor oil", "гидравлика"].
Reply with a JSON object only, no markdown: {"suggestions": ["term1", "term2", ...], "expanded_terms": ["term1", "term2", ...]}.
- suggestions: alternative search phrases the user might try (can include the original).
- expanded_terms: terms to add to an OR search (synonyms + related, 2-6 terms). Include the original query. Use for backend search expansion.
Keep suggestions and expanded_terms concise; prefer short words or common phrases."""


class SearchSuggestOut(BaseModel):
    original_query: str
    suggestions: list[str]
    expanded_terms: list[str]


async def get_search_suggestions(q: str) -> SearchSuggestOut:
    """Return synonyms and expanded terms for the search query."""
    original = (q or "").strip()
    if not original:
        return SearchSuggestOut(original_query=original, suggestions=[], expanded_terms=[])

    cache_key = f"suggest:{hashlib.sha256(original.encode()).hexdigest()}"
    cached = await cache_get(cache_key)
    if isinstance(cached, dict) and "suggestions" in cached and "expanded_terms" in cached:
        return SearchSuggestOut(
            original_query=cached.get("original_query", original),
            suggestions=cached.get("suggestions", [original]),
            expanded_terms=cached.get("expanded_terms", [original]),
        )

    client = get_openai_client()
    if not client:
        return SearchSuggestOut(original_query=original, suggestions=[original], expanded_terms=[original])

    try:
        model = getattr(settings, "openai_tool_model", None) or settings.openai_model
        resp = await create_completion_logged(
            client,
            "suggest",
            model=model,
            messages=[
                {"role": "system", "content": SUGGEST_SYSTEM_PROMPT},
                {"role": "user", "content": f"Query: {original}"},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        text = (resp.choices[0].message.content or "{}").strip()
        text = re.sub(r"^```\w*\n?", "", text).replace("```", "").strip()
        data = json.loads(text)
    except (json.JSONDecodeError, KeyError, TypeError):
        return SearchSuggestOut(original_query=original, suggestions=[original], expanded_terms=[original])

    if not isinstance(data, dict):
        return SearchSuggestOut(original_query=original, suggestions=[original], expanded_terms=[original])

    suggestions = data.get("suggestions")
    if isinstance(suggestions, list):
        suggestions = [str(x).strip() for x in suggestions if x]
    else:
        suggestions = [original]

    expanded = data.get("expanded_terms")
    if isinstance(expanded, list):
        expanded = [str(x).strip() for x in expanded if x]
    if not expanded:
        expanded = [original]
    if original and original not in expanded:
        expanded = [original] + [t for t in expanded if t != original][:5]

    result = SearchSuggestOut(
        original_query=original,
        suggestions=suggestions[:10],
        expanded_terms=expanded[:6],
    )
    await cache_set(cache_key, result.model_dump(), ttl=SUGGEST_CACHE_TTL)
    return result
