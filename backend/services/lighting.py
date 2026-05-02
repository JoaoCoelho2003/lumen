import array
from functools import lru_cache
from math import floor
import mmap
import re

from backend.core.config import LAMPS_PATH

CELL_SIZE_DEGREES = 0.01

_coords: array.array | None = None
_coord_grid: dict[tuple[int, int], list[tuple[float, float]]] | None = None


def load_lamp_coords() -> array.array:
    global _coords
    if _coords is not None:
        return _coords

    print(f"[heatmap] Loading {LAMPS_PATH.name}...")
    pattern = re.compile(rb'"coordinates"\s*:\s*\[\s*([-\d.]+)\s*,\s*([-\d.]+)')
    buf = array.array("f")

    with LAMPS_PATH.open("rb") as f:
        with mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ) as mm:
            for match in pattern.finditer(mm):
                buf.append(float(match.group(1)))
                buf.append(float(match.group(2)))

    _coords = buf
    print(f"[heatmap] Loaded {len(buf) // 2:,} points")
    return buf


def load_lamp_grid() -> dict[tuple[int, int], list[tuple[float, float]]]:
    global _coord_grid
    if _coord_grid is not None:
        return _coord_grid

    coords = load_lamp_coords()
    grid: dict[tuple[int, int], list[tuple[float, float]]] = {}

    for i in range(0, len(coords), 2):
        lon = float(coords[i])
        lat = float(coords[i + 1])
        key = (
            floor(lon / CELL_SIZE_DEGREES),
            floor(lat / CELL_SIZE_DEGREES),
        )
        grid.setdefault(key, []).append((lon, lat))

    _coord_grid = grid
    print(f"[heatmap] Indexed {len(coords) // 2:,} points into {len(grid):,} cells")
    return grid


@lru_cache(maxsize=512)
def visible_lamp_coords(
    lon_min: float,
    lat_min: float,
    lon_max: float,
    lat_max: float,
    max_points: int = 80_000,
) -> list[tuple[float, float]]:
    grid = load_lamp_grid()

    visible: list[tuple[float, float]] = []
    x_min = floor(lon_min / CELL_SIZE_DEGREES)
    x_max = floor(lon_max / CELL_SIZE_DEGREES)
    y_min = floor(lat_min / CELL_SIZE_DEGREES)
    y_max = floor(lat_max / CELL_SIZE_DEGREES)

    for x in range(x_min, x_max + 1):
        for y in range(y_min, y_max + 1):
            for lon, lat in grid.get((x, y), []):
                if lon_min <= lon <= lon_max and lat_min <= lat <= lat_max:
                    visible.append((lon, lat))

    if len(visible) > max_points:
        step = max(1, len(visible) // max_points)
        visible = visible[::step]

    return visible
