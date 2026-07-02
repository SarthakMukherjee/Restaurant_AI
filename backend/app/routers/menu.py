"""
Module 2 – Menu Management.

Customers can view the menu. Administrators can add, edit, delete, and
update prices/ratings.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_admin, get_current_user
from app.models.menu_item import MenuItem
from app.models.user import User
from app.schemas.menu_item import (
    MenuItemCreate,
    MenuItemOut,
    MenuItemPriceUpdate,
    MenuItemRatingUpdate,
    MenuItemUpdate,
)

router = APIRouter(prefix="/api/menu", tags=["Menu Management"])


async def _get_item_or_404(item_id: uuid.UUID, db: AsyncSession) -> MenuItem:
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found.")
    return item


@router.get("", response_model=list[MenuItemOut])
async def list_menu_items(
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(MenuItem).order_by(MenuItem.category, MenuItem.name)
    if category:
        query = query.where(MenuItem.category == category)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{item_id}", response_model=MenuItemOut)
async def get_menu_item(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await _get_item_or_404(item_id, db)


@router.post("", response_model=MenuItemOut, status_code=status.HTTP_201_CREATED)
async def create_menu_item(
    payload: MenuItemCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    item = MenuItem(**payload.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/{item_id}", response_model=MenuItemOut)
async def update_menu_item(
    item_id: uuid.UUID,
    payload: MenuItemUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    item = await _get_item_or_404(item_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item


@router.patch("/{item_id}/price", response_model=MenuItemOut)
async def update_menu_item_price(
    item_id: uuid.UUID,
    payload: MenuItemPriceUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    item = await _get_item_or_404(item_id, db)
    item.price = payload.price
    await db.commit()
    await db.refresh(item)
    return item


@router.patch("/{item_id}/rating", response_model=MenuItemOut)
async def update_menu_item_rating(
    item_id: uuid.UUID,
    payload: MenuItemRatingUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    item = await _get_item_or_404(item_id, db)
    item.rating = payload.rating
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_menu_item(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    item = await _get_item_or_404(item_id, db)
    await db.delete(item)
    await db.commit()
