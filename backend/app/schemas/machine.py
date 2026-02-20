from pydantic import BaseModel


class MachineOut(BaseModel):
    id: int
    brand: str
    model: str
    year: int | None

    class Config:
        from_attributes = True


class MachineCreate(BaseModel):
    brand: str
    model: str
    year: int | None = None
