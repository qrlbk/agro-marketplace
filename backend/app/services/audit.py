"""Audit log: write and query actions by users or staff."""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.audit_log import AuditLog


async def write_audit_log(
    db: AsyncSession,
    user_id: int,
    company_id: int | None,
    action: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
    details: dict | None = None,
    ip: str | None = None,
) -> None:
    """Append one record to audit_logs (user actor). Call after successful mutations."""
    log = AuditLog(
        user_id=user_id,
        staff_id=None,
        company_id=company_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        ip=ip,
    )
    db.add(log)
    await db.flush()


async def write_staff_audit_log(
    db: AsyncSession,
    staff_id: int,
    action: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
    details: dict | None = None,
    ip: str | None = None,
    company_id: int | None = None,
) -> None:
    """Append one record to audit_logs (staff actor). Call after admin/staff mutations."""
    log = AuditLog(
        user_id=None,
        staff_id=staff_id,
        company_id=company_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        ip=ip,
    )
    db.add(log)
    await db.flush()
