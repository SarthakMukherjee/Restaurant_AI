"""
Module 5 – AI Customer Feedback Analysis endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_admin, get_current_user
from app.models.feedback import Feedback
from app.models.user import User
from app.schemas.feedback import FeedbackCreate, FeedbackOut, FeedbackWithUserOut
from app.services.feedback_service import analyze_feedback

router = APIRouter(prefix="/api/feedback", tags=["AI Feedback Analysis"])


@router.post("", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    payload: FeedbackCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        analysis = await analyze_feedback(payload.review_text)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

    feedback = Feedback(
        user_id=current_user.id,
        review_text=payload.review_text,
        sentiment=analysis["sentiment"],
        summary=analysis["summary"],
        issues=analysis["issues"],
    )
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)
    return feedback


@router.get("/my", response_model=list[FeedbackOut])
async def list_my_feedback(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Feedback).where(Feedback.user_id == current_user.id).order_by(Feedback.created_at.desc())
    )
    return result.scalars().all()


@router.get("/all", response_model=list[FeedbackWithUserOut])
async def list_all_feedback(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Admin-only: view all customer feedback with AI analysis for the dashboard."""
    result = await db.execute(
        select(Feedback, User.full_name, User.email)
        .join(User, Feedback.user_id == User.id)
        .order_by(Feedback.created_at.desc())
    )
    rows = result.all()

    output = []
    for feedback, full_name, email in rows:
        item = FeedbackWithUserOut.model_validate(feedback)
        item.user_full_name = full_name
        item.user_email = email
        output.append(item)
    return output
