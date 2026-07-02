"""
Admin dashboard: user management and summary stats.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models.feedback import Feedback
from app.models.menu_item import MenuItem
from app.models.user import User
from app.schemas.user import UserOut

router = APIRouter(prefix="/api/admin", tags=["Admin Dashboard"])


@router.get("/users", response_model=list[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.get("/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
    total_menu_items = (await db.execute(select(func.count(MenuItem.id)))).scalar_one()
    total_feedback = (await db.execute(select(func.count(Feedback.id)))).scalar_one()

    sentiment_rows = (
        await db.execute(select(Feedback.sentiment, func.count(Feedback.id)).group_by(Feedback.sentiment))
    ).all()
    sentiment_breakdown = {sentiment or "Unknown": count for sentiment, count in sentiment_rows}

    return {
        "total_users": total_users,
        "total_menu_items": total_menu_items,
        "total_feedback": total_feedback,
        "sentiment_breakdown": sentiment_breakdown,
    }
