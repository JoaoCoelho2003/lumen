import array
import mmap
import os
import re
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LAMPS_FILE = "coimbra_luminarias_completo.geojson"
LAMPS_PATH = os.path.join(BASE_DIR, LAMPS_FILE)

_coords: array.array | None = None


def _load_coords() -> array.array:
    global _coords
    if _coords is not None:
        return _coords

    print(f"[heatmap] Loading {LAMPS_FILE}...")
    pattern = re.compile(rb'"coordinates"\s*:\s*\[\s*([-\d.]+)\s*,\s*([-\d.]+)')
    buf = array.array("f")

    with open(LAMPS_PATH, "rb") as f:
        with mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ) as mm:
            for m in pattern.finditer(mm):
                buf.append(float(m.group(1)))
                buf.append(float(m.group(2)))

    _coords = buf
    print(f"[heatmap] Loaded {len(buf) // 2:,} points")
    return buf


@asynccontextmanager
async def lifespan(app: FastAPI):
    _load_coords()
    yield


app = FastAPI(lifespan=lifespan)

origins = os.getenv(
    "FRONTEND_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/tile")
def serve_tile(
    lon_min: float = Query(...),
    lat_min: float = Query(...),
    lon_max: float = Query(...),
    lat_max: float = Query(...),
    zoom: float = Query(10),
):
    coords = _load_coords()

    visible: list[tuple[float, float]] = []
    for i in range(0, len(coords), 2):
        lon = coords[i]
        lat = coords[i + 1]
        if lon_min <= lon <= lon_max and lat_min <= lat <= lat_max:
            visible.append((lon, lat))

    MAX_POINTS = 80_000
    if len(visible) > MAX_POINTS:
        step = max(1, len(visible) // MAX_POINTS)
        visible = visible[::step]

    parts = [f"[{lon:.5f},{lat:.5f}]" for lon, lat in visible]
    body = (
        '{"type":"FeatureCollection","features":['
        + ",".join(
            f'{{"type":"Feature","geometry":{{"type":"Point","coordinates":{c}}},"properties":null}}'
            for c in parts
        )
        + "]}"
    )

    return Response(content=body, media_type="application/geo+json")
