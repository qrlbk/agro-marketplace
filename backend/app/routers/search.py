"""Search suggest endpoint for Smart Search."""
from fastapi import APIRouter, Depends, Query

from app.dependencies import check_search_suggest_rate_limit
from app.services.search_suggest import get_search_suggestions, SearchSuggestOut

router = APIRouter()


@router.get("/suggest", response_model=SearchSuggestOut)
async def search_suggest(
    q: str = Query(..., min_length=1),
    _rl: None = Depends(check_search_suggest_rate_limit),
):
    """Return AI-suggested synonyms and expanded terms for the query (for Smart Search)."""
    return await get_search_suggestions(q)
