import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReservationRequestIn(BaseModel):
    text: str = Field(min_length=1, max_length=500, description="e.g. 'Book a table at 7 PM on Friday'")


class ReservationRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    raw_text: str
    intent: str | None
    extracted_time: str | None
    extracted_day: str | None
    party_size: str | None
    created_at: datetime
