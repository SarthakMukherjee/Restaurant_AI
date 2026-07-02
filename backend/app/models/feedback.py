"""
Customer feedback model, storing both raw review text and AI-generated analysis.
"""
import uuid
from datetime import datetime

from sqlalchemy import ARRAY, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Feedback(Base):
    __tablename__ = "feedbacks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    review_text: Mapped[str] = mapped_column(Text, nullable=False)

    # --- AI-generated analysis (populated after LLM call) ---
    sentiment: Mapped[str] = mapped_column(String(20), nullable=True)  # Positive / Negative / Neutral
    summary: Mapped[str] = mapped_column(Text, nullable=True)
    issues: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=True, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="feedbacks")
