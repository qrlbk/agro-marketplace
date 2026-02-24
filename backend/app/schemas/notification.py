from datetime import datetime
from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: int
    user_id: int
    type: str
    payload: dict
    read_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True
