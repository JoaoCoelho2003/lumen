import json
from functools import lru_cache
from typing import Any

from backend.core.config import CRIME_STREETS_PATH

CrimeFeature = dict[str, Any]

_crime_features: list[tuple[tuple[float, float, float, float], CrimeFeature]] | None = None


def _line_bbox(coordinates: list[list[float]]) -> tuple[float, float, float, float]:
    lons = [point[0] for point in coordinates]
    lats = [point[1] for point in coordinates]
    return min(lons), min(lats), max(lons), max(lats)


def _feature_bbox(feature: CrimeFeature) -> tuple[float, float, float, float]:
    geometry = feature.get("geometry", {})
    geometry_type = geometry.get("type")
    coordinates = geometry.get("coordinates", [])

    if geometry_type == "LineString":
        return _line_bbox(coordinates)

    if geometry_type == "MultiLineString":
        boxes = [_line_bbox(line) for line in coordinates]
        return (
            min(box[0] for box in boxes),
            min(box[1] for box in boxes),
            max(box[2] for box in boxes),
            max(box[3] for box in boxes),
        )

    return 0.0, 0.0, 0.0, 0.0


def _intersects(
    feature_bbox: tuple[float, float, float, float],
    lon_min: float,
    lat_min: float,
    lon_max: float,
    lat_max: float,
) -> bool:
    f_lon_min, f_lat_min, f_lon_max, f_lat_max = feature_bbox
    return not (
        f_lon_max < lon_min
        or f_lon_min > lon_max
        or f_lat_max < lat_min
        or f_lat_min > lat_max
    )


def load_crime_features() -> list[tuple[tuple[float, float, float, float], CrimeFeature]]:
    global _crime_features
    if _crime_features is not None:
        return _crime_features

    with CRIME_STREETS_PATH.open("r", encoding="utf-8") as file:
        collection = json.load(file)

    _crime_features = [
        (_feature_bbox(feature), feature)
        for feature in collection.get("features", [])
    ]
    print(f"[crime] Loaded {len(_crime_features):,} street features")
    return _crime_features


@lru_cache(maxsize=512)
def visible_crime_collection(
    lon_min: float,
    lat_min: float,
    lon_max: float,
    lat_max: float,
) -> dict[str, Any]:
    features = [
        feature
        for bbox, feature in load_crime_features()
        if _intersects(bbox, lon_min, lat_min, lon_max, lat_max)
    ]

    return {
        "type": "FeatureCollection",
        "features": features,
    }
