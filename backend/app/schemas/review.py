from pydantic import BaseModel, Field


class ReviewCreateIn(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    text: str | None = Field(None, max_length=2000)


class ReviewOut(BaseModel):
    id: int
    user_id: int
    author_display: str
    rating: int
    text: str | None
    created_at: str

    class Config:
        from_attributes = True


class ProductReviewsResponse(BaseModel):
    items: list[ReviewOut]
    total_count: int
    average_rating: float | None


class VendorRatingOut(BaseModel):
    average_rating: float
    total_reviews: int
