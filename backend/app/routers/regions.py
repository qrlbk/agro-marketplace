"""Regions of Kazakhstan — read-only list for frontend and validation."""

from fastapi import APIRouter

from app.constants.regions import REGIONS_KZ

router = APIRouter()


@router.get("", response_model=list[str])
def list_regions() -> list[str]:
    """Return the list of regions of Kazakhstan (single source of truth)."""
    return list(REGIONS_KZ)
