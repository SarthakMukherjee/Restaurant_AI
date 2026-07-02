import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MenuItemBase(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    category: str = Field(min_length=1, max_length=100)
    description: str | None = ""
    price: float = Field(gt=0)
    rating: float = Field(ge=0, le=5, default=0.0)
    is_available: bool = True


class MenuItemCreate(MenuItemBase):
    pass


class MenuItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    category: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    price: float | None = Field(default=None, gt=0)
    rating: float | None = Field(default=None, ge=0, le=5)
    is_available: bool | None = None


class MenuItemRatingUpdate(BaseModel):
    rating: float = Field(ge=0, le=5)


class MenuItemPriceUpdate(BaseModel):
    price: float = Field(gt=0)


class MenuItemOut(MenuItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
