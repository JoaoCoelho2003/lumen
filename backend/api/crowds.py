from datetime import datetime, timedelta, timezone
from math import asin, cos, radians, sin, sqrt

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.db.models import CrowdPresence

router = APIRouter(prefix="/crowds", tags=["crowds"])

ACTIVE_WINDOW_MINUTES = 12
CLUSTER_RADIUS_KM = 0.08
MAX_SAFE_SPOT_DISTANCE_KM = 25
MIN_CLUSTER_USERS = 2


class CrowdHeartbeatRequest(BaseModel):
    client_id: str = Field(..., min_length=8, max_length=120)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    accuracy_m: float | None = Field(default=None, ge=0, le=5000)


class CrowdSafeSpotResponse(BaseModel):
    id: str
    name: str
    address: str
    coordinates: list[float]
    kind: str
    distance: float
    crowd_count: int


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return radius_km * 2 * asin(sqrt(a))


def active_cutoff() -> datetime:
    return datetime.now(timezone.utc) - timedelta(minutes=ACTIVE_WINDOW_MINUTES)


async def prune_stale_presence(db: AsyncSession) -> None:
    await db.execute(delete(CrowdPresence).where(CrowdPresence.updated_at < active_cutoff()))


@router.post("/heartbeat")
async def update_crowd_heartbeat(
    data: CrowdHeartbeatRequest,
    db: AsyncSession = Depends(get_db),
):
    await prune_stale_presence(db)

    result = await db.execute(
        select(CrowdPresence).where(CrowdPresence.client_id == data.client_id)
    )
    presence = result.scalar_one_or_none()
    now = datetime.now(timezone.utc)

    if presence is None:
        presence = CrowdPresence(
            client_id=data.client_id,
            latitude=data.latitude,
            longitude=data.longitude,
            accuracy_m=data.accuracy_m,
            updated_at=now,
        )
        db.add(presence)
    else:
        presence.latitude = data.latitude
        presence.longitude = data.longitude
        presence.accuracy_m = data.accuracy_m
        presence.updated_at = now

    await db.commit()
    return {"ok": True}


@router.get("/safe-spots", response_model=list[CrowdSafeSpotResponse])
async def get_crowd_safe_spots(
    latitude: float,
    longitude: float,
    db: AsyncSession = Depends(get_db),
):
    await prune_stale_presence(db)
    await db.commit()

    result = await db.execute(
        select(CrowdPresence).where(CrowdPresence.updated_at >= active_cutoff())
    )
    active_points = [
        point
        for point in result.scalars().all()
        if haversine_km(latitude, longitude, point.latitude, point.longitude)
        <= MAX_SAFE_SPOT_DISTANCE_KM
    ]

    clusters: list[list[CrowdPresence]] = []
    for point in active_points:
        matching_cluster = None
        for cluster in clusters:
            center_lat = sum(p.latitude for p in cluster) / len(cluster)
            center_lon = sum(p.longitude for p in cluster) / len(cluster)
            if haversine_km(center_lat, center_lon, point.latitude, point.longitude) <= CLUSTER_RADIUS_KM:
                matching_cluster = cluster
                break

        if matching_cluster is None:
            clusters.append([point])
        else:
            matching_cluster.append(point)

    safe_spots: list[CrowdSafeSpotResponse] = []
    for index, cluster in enumerate(clusters):
        if len(cluster) < MIN_CLUSTER_USERS:
            continue

        center_lat = sum(point.latitude for point in cluster) / len(cluster)
        center_lon = sum(point.longitude for point in cluster) / len(cluster)
        distance = haversine_km(latitude, longitude, center_lat, center_lon)
        safe_spots.append(
            CrowdSafeSpotResponse(
                id=f"crowd-{index}-{round(center_lat, 5)}-{round(center_lon, 5)}",
                name=f"Active crowd ({len(cluster)} people)",
                address="Recent Lumen users nearby",
                coordinates=[center_lon, center_lat],
                kind="crowd",
                distance=distance,
                crowd_count=len(cluster),
            )
        )

    return sorted(safe_spots, key=lambda spot: (-spot.crowd_count, spot.distance))[:10]
