"""Pydantic schemas for AI maintenance recommendations."""
from pydantic import BaseModel


class MaintenanceRecommendation(BaseModel):
    """Single maintenance kit recommendation (e.g. 500h service)."""

    interval_h: int | None = None
    items: list[str]
    reason: str


class MaintenanceAdviceOut(BaseModel):
    """Maintenance advice for one garage machine."""

    garage_id: int
    machine_id: int
    brand: str
    model: str
    year: int | None
    moto_hours: int | None
    recommendations: list[MaintenanceRecommendation]
    error_message: str | None = None
