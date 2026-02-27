"""Helpers for enforcing vendor storage quotas."""
from fastapi import HTTPException


def ensure_storage_quota(current_usage_mb: float, quota_mb: float, addition_mb: float) -> float:
    """Return new usage if quota allows adding `addition_mb`; raise HTTPException 413 otherwise."""
    current = float(current_usage_mb or 0.0)
    addition = max(float(addition_mb or 0.0), 0.0)
    if addition <= 0:
        return current
    if quota_mb <= 0:
        return current + addition
    new_total = current + addition
    if new_total > quota_mb:
        raise HTTPException(
            status_code=413,
            detail=f"Превышен лимит хранилища ({quota_mb} МБ). Удалите лишние файлы и повторите загрузку.",
        )
    return new_total
