from pydantic import BaseModel


class CategoryOut(BaseModel):
    id: int
    parent_id: int | None
    name: str
    slug: str

    class Config:
        from_attributes = True


class CategoryCreate(BaseModel):
    parent_id: int | None = None
    name: str
    slug: str


class CategoryTreeOut(CategoryOut):
    children: list["CategoryTreeOut"] = []


CategoryTreeOut.model_rebuild()
