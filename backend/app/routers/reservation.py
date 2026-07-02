"""
Module 4 – AI Reservation Booking Assistant endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.reservation import ReservationRequest
from app.models.user import User
from app.schemas.reservation import ReservationRequestIn, ReservationRequestOut
from app.services.reservation_service import extract_reservation_details

router = APIRouter(prefix="/api/reservations", tags=["AI Reservation Assistant"])


@router.post("", response_model=ReservationRequestOut, status_code=status.HTTP_201_CREATED)
async def create_reservation_request(
    payload: ReservationRequestIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        details = await extract_reservation_details(payload.text)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

    reservation = ReservationRequest(
        user_id=current_user.id,
        raw_text=payload.text,
        intent=details["intent"],
        extracted_time=details["time"],
        extracted_day=details["day"],
        party_size=details["party_size"],
    )
    db.add(reservation)
    await db.commit()
    await db.refresh(reservation)
    return reservation


@router.get("/my", response_model=list[ReservationRequestOut])
async def list_my_reservation_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ReservationRequest)
        .where(ReservationRequest.user_id == current_user.id)
        .order_by(ReservationRequest.created_at.desc())
    )
    return result.scalars().all()
