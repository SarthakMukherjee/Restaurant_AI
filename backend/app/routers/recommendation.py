"""
Module 3 – AI Menu Recommendation endpoint.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.menu_item import MenuItem
from app.models.user import User
from app.schemas.recommendation import RecommendationRequest, RecommendationResponse
from app.services.recommendation_service import get_recommendation

router = APIRouter(prefix="/api/recommendations", tags=["AI Menu Recommendation"])


@router.post("", response_model=RecommendationResponse)
async def recommend_menu_items(
    payload: RecommendationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(MenuItem).where(MenuItem.is_available == True))  # noqa: E712
    menu_items = result.scalars().all()

    if not menu_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The menu is currently empty. Ask an administrator to add items first.",
        )

    try:
        recommendation_text = await get_recommendation(payload.query, list(menu_items))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

    return RecommendationResponse(query=payload.query, recommendation=recommendation_text)
