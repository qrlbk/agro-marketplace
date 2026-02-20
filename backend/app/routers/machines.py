from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.machine import Machine
from app.schemas.machine import MachineOut, MachineCreate
from app.dependencies import get_current_admin

router = APIRouter()


@router.get("", response_model=list[MachineOut])
async def list_machines(
    brand: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Machine).order_by(Machine.brand, Machine.model)
    if brand:
        stmt = stmt.where(Machine.brand.ilike(f"%{brand}%"))
    result = await db.execute(stmt)
    machines = result.scalars().all()
    return [MachineOut.model_validate(m) for m in machines]


@router.post("", response_model=MachineOut)
async def create_machine(
    body: MachineCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    machine = Machine(brand=body.brand, model=body.model, year=body.year)
    db.add(machine)
    await db.flush()
    await db.refresh(machine)
    return MachineOut.model_validate(machine)
