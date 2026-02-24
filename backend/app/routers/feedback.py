from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.feedback import FeedbackTicket, FeedbackStatus
from app.models.order import Order
from app.models.product import Product
from app.schemas.feedback import FeedbackCreate, FeedbackOut
from app.dependencies import get_current_user_optional

router = APIRouter()


@router.post("", response_model=FeedbackOut)
async def create_feedback(
    body: FeedbackCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    if not current_user and not body.contact_phone:
        raise HTTPException(
            400,
            "Для анонимного обращения укажите контактный телефон (contact_phone).",
        )
    order_id: int | None = None
    if body.order_id is not None:
        if not current_user:
            pass  # anonymous: do not attach order
        else:
            result = await db.execute(select(Order).where(Order.id == body.order_id))
            order = result.scalar_one_or_none()
            if order is None:
                raise HTTPException(400, "Заказ не найден.")
            if order.user_id != current_user.id:
                raise HTTPException(403, "Нельзя привязать обращение к чужому заказу.")
            order_id = order.id
    product_id: int | None = None
    if body.product_id is not None:
        result = await db.execute(select(Product).where(Product.id == body.product_id))
        product = result.scalar_one_or_none()
        if product is None:
            raise HTTPException(400, "Товар не найден.")
        product_id = product.id
    ticket = FeedbackTicket(
        user_id=current_user.id if current_user else None,
        subject=body.subject,
        message=body.message,
        contact_phone=body.contact_phone or (current_user.phone if current_user else None),
        status=FeedbackStatus.open,
        order_id=order_id,
        product_id=product_id,
    )
    db.add(ticket)
    await db.flush()
    return FeedbackOut(id=ticket.id)
