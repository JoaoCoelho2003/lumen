import json

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from backend.core.config import CRIME_STREETS_PATH
from backend.services.crime import visible_crime_collection
from backend.services.lighting import visible_lamp_coords

router = APIRouter(prefix="/api", tags=["map-data"])
CACHE_HEADERS = {"Cache-Control": "public, max-age=30, stale-while-revalidate=120"}


@router.get("/tile")
def serve_lighting_tile(
    lon_min: float = Query(...),
    lat_min: float = Query(...),
    lon_max: float = Query(...),
    lat_max: float = Query(...),
    zoom: float = Query(10),
):
    visible = visible_lamp_coords(
        round(lon_min, 3),
        round(lat_min, 3),
        round(lon_max, 3),
        round(lat_max, 3),
    )

    parts = [f"[{lon:.5f},{lat:.5f}]" for lon, lat in visible]
    body = (
        '{"type":"FeatureCollection","features":['
        + ",".join(
            f'{{"type":"Feature","geometry":{{"type":"Point","coordinates":{coords}}},"properties":null}}'
            for coords in parts
        )
        + "]}"
    )

    return Response(
        content=body,
        media_type="application/geo+json",
        headers=CACHE_HEADERS,
    )


@router.get("/crime-streets")
def serve_crime_streets(
    lon_min: float | None = Query(None),
    lat_min: float | None = Query(None),
    lon_max: float | None = Query(None),
    lat_max: float | None = Query(None),
):
    if not CRIME_STREETS_PATH.exists():
        raise HTTPException(status_code=404, detail="Crime streets file not found")

    if None not in (lon_min, lat_min, lon_max, lat_max):
        collection = visible_crime_collection(
            round(lon_min, 3),
            round(lat_min, 3),
            round(lon_max, 3),
            round(lat_max, 3),
        )
        return Response(
            content=json.dumps(collection, separators=(",", ":")),
            media_type="application/geo+json",
            headers=CACHE_HEADERS,
        )

    return Response(
        content=CRIME_STREETS_PATH.read_bytes(),
        media_type="application/geo+json",
        headers=CACHE_HEADERS,
    )
