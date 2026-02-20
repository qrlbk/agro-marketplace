from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.garage import Garage
from app.models.machine import Machine
from app.schemas.garage import GarageOut, GarageCreate, GarageWithMachineOut
from app.dependencies import get_current_farmer
from app.models.user import User

router = APIRouter()


@router.get("/machines", response_model=list[GarageWithMachineOut])
async def list_garage(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_farmer),
):
    result = await db.execute(
        select(Garage, Machine.brand, Machine.model, Machine.year)
        .join(Machine, Garage.machine_id == Machine.id)
        .where(Garage.user_id == current_user.id)
    )
    rows = result.all()
    return [
        GarageWithMachineOut(
            id=g.id,
            user_id=g.user_id,
            machine_id=g.machine_id,
            serial_number=g.serial_number,
            moto_hours=g.moto_hours,
            brand=brand,
            model=model,
            year=year,
        )
        for g, brand, model, year in rows
    ]


@router.post("/machines", response_model=GarageOut)
async def add_to_garage(
    body: GarageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_farmer),
):
    result = await db.execute(select(Machine).where(Machine.id == body.machine_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(404, "Machine not found")
    garage = Garage(
        user_id=current_user.id,
        machine_id=body.machine_id,
        serial_number=body.serial_number,
        moto_hours=body.moto_hours,
    )
    db.add(garage)
    await db.flush()
    await db.refresh(garage)
    return GarageOut.model_validate(garage)


@router.delete("/machines/{garage_id}", status_code=204)
async def remove_from_garage(
    garage_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_farmer),
):
    result = await db.execute(select(Garage).where(Garage.id == garage_id, Garage.user_id == current_user.id))
    garage = result.scalar_one_or_none()
    if garage:
        await db.delete(garage)
