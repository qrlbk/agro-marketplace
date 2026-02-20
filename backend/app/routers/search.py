"""Search suggest endpoint for Smart Search."""
from fastapi import APIRouter, Query

from app.services.search_suggest import get_search_suggestions, SearchSuggestOut

router = APIRouter()


@router.get("/suggest", response_model=SearchSuggestOut)
async def search_suggest(q: str = Query(..., min_length=1)):
    """Return AI-suggested synonyms and expanded terms for the query (for Smart Search)."""
    return await get_search_suggestions(q)
