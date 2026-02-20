from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.user import User, UserRole
from app.models.order import Order, OrderStatus
from app.schemas.user import UserOut
from app.dependencies import get_current_admin
from pydantic import BaseModel

router = APIRouter()


class UserUpdateRole(BaseModel):
    role: UserRole


@router.get("/users", response_model=list[UserOut])
async def list_users(
    role: UserRole | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    stmt = select(User).order_by(User.id)
    if role:
        stmt = stmt.where(User.role == role)
    result = await db.execute(stmt)
    return [UserOut.model_validate(u) for u in result.scalars().all()]


@router.patch("/users/{user_id}/role", response_model=UserOut)
async def set_user_role(
    user_id: int,
    body: UserUpdateRole,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    user.role = body.role
    await db.flush()
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.get("/analytics")
async def analytics(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    total_orders = (await db.execute(select(func.count()).select_from(Order))).scalar() or 0
    total_revenue = (await db.execute(select(func.coalesce(func.sum(Order.total_amount), 0)).select_from(Order))).scalar() or 0
    by_status = (
        await db.execute(
            select(Order.status, func.count(Order.id)).group_by(Order.status)
        )
    ).all()
    return {
        "total_orders": total_orders,
        "total_revenue": float(total_revenue),
        "by_status": {s.value: c for s, c in by_status},
    }
