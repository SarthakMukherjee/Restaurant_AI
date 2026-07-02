"""
Reservation request model. Stores the raw natural-language request plus the
structured details extracted by the LLM. No actual table booking occurs (per MVP scope).
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ReservationRequest(Base):
    __tablename__ = "reservation_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    raw_text: Mapped[str] = mapped_column(Text, nullable=False)

    # --- AI-extracted structured fields ---
    intent: Mapped[str] = mapped_column(String(50), nullable=True)
    extracted_time: Mapped[str] = mapped_column(String(50), nullable=True)
    extracted_day: Mapped[str] = mapped_column(String(50), nullable=True)
    party_size: Mapped[str] = mapped_column(String(20), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="reservations")
