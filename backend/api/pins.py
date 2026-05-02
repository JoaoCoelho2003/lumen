from math import asin, cos, radians, sin, sqrt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.db.models import Pin

router = APIRouter(prefix="/pins", tags=["pins"])

CLUSTER_RADIUS_KM = 0.035


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return R * 2 * asin(sqrt(a))


def pin_to_dict(p: Pin) -> dict:
    return {
        "id": p.id,
        "latitude": p.latitude,
        "longitude": p.longitude,
        "pin_type": p.pin_type,
        "user_id": p.user_id,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


class PinCreate(BaseModel):
    latitude: float
    longitude: float
    pin_type: str
    user_id: str | None = None


@router.get("", include_in_schema=False)
@router.get("/")
async def get_pins(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Pin).order_by(Pin.created_at.desc()))
    return [pin_to_dict(p) for p in result.scalars().all()]


@router.post("", include_in_schema=False)
@router.post("/")
async def create_pin(data: PinCreate, db: AsyncSession = Depends(get_db)):
    if not data.user_id:
        raise HTTPException(status_code=401, detail="Login required to create pins")

    # one pin per identity (user_id or anonymous) per type per cluster
    query = select(Pin).where(Pin.user_id == data.user_id, Pin.pin_type == data.pin_type)

    result = await db.execute(query)
    for existing in result.scalars().all():
        if haversine_km(existing.latitude, existing.longitude, data.latitude, data.longitude) <= CLUSTER_RADIUS_KM:
            return pin_to_dict(existing)

    pin = Pin(
        latitude=data.latitude,
        longitude=data.longitude,
        pin_type=data.pin_type,
        user_id=data.user_id,
    )
    db.add(pin)
    await db.commit()
    await db.refresh(pin)
    return pin_to_dict(pin)
