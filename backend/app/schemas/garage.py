from pydantic import BaseModel, Field


class GarageOut(BaseModel):
    id: int
    user_id: int
    machine_id: int
    serial_number: str | None
    moto_hours: int | None

    class Config:
        from_attributes = True


class GarageCreate(BaseModel):
    machine_id: int
    serial_number: str | None = None
    moto_hours: int | None = Field(None, ge=0)


class GarageWithMachineOut(GarageOut):
    brand: str | None = None
    model: str | None = None
    year: int | None = None
