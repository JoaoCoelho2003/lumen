from asyncio import Lock
from math import asin, cos, radians, sin, sqrt
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import Base, engine, get_db
from backend.db.models import Pin

router = APIRouter(prefix="/pins", tags=["pins"])

CLUSTER_RADIUS_KM = 0.2
_pins_table_ready = False
_pins_table_lock = Lock()


async def _ensure_pins_table() -> None:
    global _pins_table_ready

    if _pins_table_ready:
      return

    async with _pins_table_lock:
        if _pins_table_ready:
            return

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        _pins_table_ready = True


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


@router.get("/")
async def get_pins(db: AsyncSession = Depends(get_db)):
    await _ensure_pins_table()
    result = await db.execute(select(Pin).order_by(Pin.created_at.desc()))
    return [pin_to_dict(p) for p in result.scalars().all()]


@router.post("/")
async def create_pin(data: PinCreate, db: AsyncSession = Depends(get_db)):
    await _ensure_pins_table()
    # one pin per identity (user_id or anonymous) per type per cluster
    if data.user_id:
        query = select(Pin).where(Pin.user_id == data.user_id, Pin.pin_type == data.pin_type)
    else:
        query = select(Pin).where(Pin.user_id.is_(None), Pin.pin_type == data.pin_type)

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
