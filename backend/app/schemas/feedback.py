import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class FeedbackCreate(BaseModel):
    review_text: str = Field(min_length=1, max_length=2000)


class FeedbackOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    review_text: str
    sentiment: str | None
    summary: str | None
    issues: list[str] | None
    created_at: datetime


class FeedbackWithUserOut(FeedbackOut):
    user_full_name: str | None = None
    user_email: str | None = None
