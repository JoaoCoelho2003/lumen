from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence
from datetime import datetime
try:
    from timezonefinder import TimezoneFinder
    from zoneinfo import ZoneInfo
    from astral import Observer
    from astral.sun import sun
    _TZ_AVAILABLE = True
    _TZFINDER = TimezoneFinder()
except Exception:
    _TZ_AVAILABLE = False
    _TZFINDER = None

import geopandas as gpd
from shapely.geometry import LineString


def _dedupe_consecutive_coordinates(coordinates: Sequence[Sequence[float]]) -> List[List[float]]:
    cleaned: List[List[float]] = []
    for raw_coordinate in coordinates:
        if raw_coordinate is None or len(raw_coordinate) < 2:
            continue
        coordinate = [float(raw_coordinate[0]), float(raw_coordinate[1])]
        if not cleaned or cleaned[-1] != coordinate:
            cleaned.append(coordinate)
    return cleaned


def _longest_false_run(values: Sequence[bool]) -> int:
    longest = 0
    current = 0
    for value in values:
        if value:
            current = 0
        else:
            current += 1
            longest = max(longest, current)
    return longest


def _score_to_percent(score: float) -> float:
    return round(100.0 / (1.0 + math.exp(-score / 20.0)), 2)


def _union_geometry(frame: gpd.GeoDataFrame):
    if frame is None or frame.empty:
        return None

    union_all = getattr(frame.geometry, "union_all", None)
    if callable(union_all):
        return union_all()

    return frame.geometry.unary_union


@dataclass
class RouteScoreResult:
    name: Optional[str]
    score: float
    score_percent: float
    coverage: float
    longest_dark_run_ratio: float
    light_points_near_route: int
    crime_points_near_route: int
    light_density_per_km: float
    crime_density_per_km: float
    distance_km: float
    duration_minutes: Optional[float]
    notes: List[str]
    geometry: Dict[str, Any]


class LightFirstRouteScorer:
    def __init__(
        self,
        data_dir: Optional[Path] = None,
        lights_filename: str = "coimbra_luminarias_completo.geojson",
        crimes_filename: str = "coimbra_crime_streets.geojson",
        target_epsg: int = 3763,
    ) -> None:
        base_dir = Path(data_dir) if data_dir is not None else Path(__file__).resolve().parents[1]
        self.data_dir = base_dir
        self.lights_path = self.data_dir / lights_filename
        self.crimes_path = self.data_dir / crimes_filename
        self.target_epsg = target_epsg
        self._lights: Optional[gpd.GeoDataFrame] = None
        self._crimes: Optional[gpd.GeoDataFrame] = None
        self._light_union = None
        self._crime_union = None
        self._route_geometry: Optional[LineString] = None
    def load_data(self) -> Dict[str, bool]:
        status = {"lights": False, "crimes": False}

        if self.lights_path.exists():
            self._lights = self._load_geodataframe(self.lights_path)
            self._light_union = _union_geometry(self._lights)
            status["lights"] = self._lights is not None and not self._lights.empty
        else:
            self._lights = None
            self._light_union = None

        if self.crimes_path.exists():
            self._crimes = self._load_geodataframe(self.crimes_path)
            self._crime_union = _union_geometry(self._crimes)
            status["crimes"] = self._crimes is not None and not self._crimes.empty
        else:
            self._crimes = None
            self._crime_union = None

        return status

    def _load_geodataframe(self, path: Path) -> gpd.GeoDataFrame:
        geodataframe = gpd.read_file(path)
        if geodataframe.crs is None:
            geodataframe = geodataframe.set_crs(epsg=4326, allow_override=True)
        return geodataframe.to_crs(epsg=self.target_epsg)

    def _route_line_from_input(self, route_input: Dict[str, Any]) -> LineString:
        if not isinstance(route_input, dict):
            raise ValueError("Route input must be a dictionary")

        if route_input.get("type") == "LineString" and route_input.get("coordinates"):
            coordinates = _dedupe_consecutive_coordinates(route_input["coordinates"])
            if len(coordinates) < 2:
                raise ValueError("Route geometry needs at least two coordinates")
            return LineString(coordinates)

        if "geometry" in route_input and isinstance(route_input["geometry"], dict):
            geometry = route_input["geometry"]
            if geometry.get("type") == "LineString" and geometry.get("coordinates"):
                coordinates = _dedupe_consecutive_coordinates(geometry["coordinates"])
                if len(coordinates) < 2:
                    raise ValueError("Route geometry needs at least two coordinates")
                return LineString(coordinates)

        if "legs" in route_input and isinstance(route_input["legs"], list):
            coordinates: List[List[float]] = []
            for leg in route_input["legs"]:
                geometry = leg.get("geometry") if isinstance(leg, dict) else None
                if not geometry:
                    continue
                leg_coordinates = geometry.get("coordinates")
                if not leg_coordinates:
                    continue
                for raw_coordinate in leg_coordinates:
                    if raw_coordinate is None or len(raw_coordinate) < 2:
                        continue
                    coordinate = [float(raw_coordinate[0]), float(raw_coordinate[1])]
                    if not coordinates or coordinates[-1] != coordinate:
                        coordinates.append(coordinate)

            coordinates = _dedupe_consecutive_coordinates(coordinates)
            if len(coordinates) < 2:
                raise ValueError("Could not extract a route line from the input route")
            return LineString(coordinates)

        if "routes" in route_input and isinstance(route_input["routes"], list) and route_input["routes"]:
            first_route = route_input["routes"][0]
            if isinstance(first_route, dict):
                return self._route_line_from_input(first_route)

        raise ValueError("Unsupported route format. Provide a LineString or a route response with leg geometries.")

    def score_route(
        self,
        route_input: Dict[str, Any],
        name: Optional[str] = None,
        duration_minutes: Optional[float] = None,
        distance_km: Optional[float] = None,
        light_buffer_m: float = 12.0,
        sample_spacing_m: float = 20.0,
        light_weight: float = 1.0,
        crime_weight: float = 1.0,
    ) -> RouteScoreResult:
        route_line_wgs84 = self._route_line_from_input(route_input)
        route_frame = gpd.GeoDataFrame(geometry=[route_line_wgs84], crs="EPSG:4326").to_crs(epsg=self.target_epsg)
        route_line = route_frame.geometry.iloc[0]

        route_length_m = float(route_line.length)
        route_distance_km = float(distance_km) if distance_km is not None else route_length_m / 1000.0
        if route_distance_km <= 0:
            route_distance_km = 0.001

        sample_count = max(2, int(route_length_m / max(sample_spacing_m, 1.0)) + 1)
        sample_points = [route_line.interpolate(route_length_m * index / (sample_count - 1)) for index in range(sample_count)]

        notes: List[str] = []
        if self._lights is None:
            notes.append("light data unavailable; score is based on route shape and duration only")

        if self._lights is not None and not self._lights.empty and self._light_union is not None:
            lit_flags = [point.distance(self._light_union) <= light_buffer_m for point in sample_points]
            coverage = sum(lit_flags) / len(lit_flags)
            longest_dark_run_ratio = _longest_false_run(lit_flags) / len(lit_flags)
            route_buffer = route_line.buffer(light_buffer_m)
            light_points_near_route = int(self._lights[self._lights.geometry.within(route_buffer)].shape[0])
        else:
            coverage = 0.0
            longest_dark_run_ratio = 1.0
            light_points_near_route = 0

        if self._crimes is not None and not self._crimes.empty and self._crime_union is not None:
            crime_buffer = route_line.buffer(light_buffer_m)
            crime_points_near_route = int(self._crimes[self._crimes.geometry.within(crime_buffer)].shape[0])
        else:
            crime_points_near_route = 0

        light_density_per_km = light_points_near_route / route_distance_km
        crime_density_per_km = crime_points_near_route / route_distance_km

        # determine day/night using timezone and solar times when available
        centroid = route_line_wgs84.centroid
        lon = float(centroid.x)
        lat = float(centroid.y)
        effective_is_night = False

        if _TZ_AVAILABLE:
            try:
                tzname = _TZFINDER.timezone_at(lng=lon, lat=lat)
                if tzname is not None:
                    try:
                        local_dt = datetime.now(ZoneInfo(tzname))
                        obs = Observer(latitude=lat, longitude=lon, elevation=0)
                        s = sun(observer=obs, date=local_dt.date(), tzinfo=ZoneInfo(tzname))
                        sunrise = s.get("sunrise")
                        sunset = s.get("sunset")
                        if sunrise is None or sunset is None:
                            # fallback to longitude heuristic
                            raise ValueError("sunrise/sunset not available")
                        effective_is_night = (local_dt < sunrise) or (local_dt >= sunset)
                    except Exception:
                        # fallback to longitude-based heuristic if any local calculation fails
                        utc_hour = datetime.utcnow().hour
                        tz_offset = int(round(lon / 15.0))
                        local_hour = (utc_hour + tz_offset) % 24
                        effective_is_night = (local_hour < 6) or (local_hour >= 19)
                        notes.append("fallback: used longitude heuristic for day/night detection")
                else:
                    # couldn't resolve timezone name; fallback
                    utc_hour = datetime.utcnow().hour
                    tz_offset = int(round(lon / 15.0))
                    local_hour = (utc_hour + tz_offset) % 24
                    effective_is_night = (local_hour < 6) or (local_hour >= 19)
                    notes.append("fallback: timezone lookup failed; used longitude heuristic")
            except Exception:
                utc_hour = datetime.utcnow().hour
                tz_offset = int(round(lon / 15.0))
                local_hour = (utc_hour + tz_offset) % 24
                effective_is_night = (local_hour < 6) or (local_hour >= 19)
                notes.append("fallback: error during timezone/sun calculation; used longitude heuristic")
        else:
            # timezone/sun libraries unavailable; approximate by longitude
            utc_hour = datetime.utcnow().hour
            tz_offset = int(round(lon / 15.0))
            local_hour = (utc_hour + tz_offset) % 24
            effective_is_night = (local_hour < 6) or (local_hour >= 19)
            notes.append("approximate day/night: install timezonefinder and astral for accuracy")

        effective_light_weight = light_weight if effective_is_night else 0.0
        if not effective_is_night:
            notes.append("Daylight mode: street lighting is not used while ranking this route.")

        duration_value = float(duration_minutes) if duration_minutes is not None else None
        duration_penalty = duration_value if duration_value is not None else 0.0
        crime_penalty = crime_density_per_km * crime_weight

        if effective_is_night:
            score = (
                coverage * 100.0 * effective_light_weight
                + min(light_density_per_km, 25.0) * 1.5 * effective_light_weight
                - duration_penalty
                - longest_dark_run_ratio * 80.0 * effective_light_weight
                - crime_penalty
            )
        else:
            # In daylight, lighting should be neutral rather than turning every
            # route into a negative score. Keep duration and crime meaningful.
            score = 35.0 - min(duration_penalty, 60.0) * 0.8 - crime_penalty
        score_percent = _score_to_percent(score)

        return RouteScoreResult(
            name=name,
            score=score,
            score_percent=score_percent,
            coverage=coverage,
            longest_dark_run_ratio=longest_dark_run_ratio,
            light_points_near_route=light_points_near_route,
            crime_points_near_route=crime_points_near_route,
            light_density_per_km=light_density_per_km,
            crime_density_per_km=crime_density_per_km,
            distance_km=route_distance_km,
            duration_minutes=duration_value,
            notes=notes,
            geometry={
                "type": "LineString",
                "coordinates": [[float(x), float(y)] for x, y in route_line_wgs84.coords],
            },
        )


_scorer_instance: Optional[LightFirstRouteScorer] = None


def get_scorer(data_dir: Optional[Path] = None) -> LightFirstRouteScorer:
    global _scorer_instance
    if _scorer_instance is None:
        _scorer_instance = LightFirstRouteScorer(data_dir=data_dir)
    return _scorer_instance
