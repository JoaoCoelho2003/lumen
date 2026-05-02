from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.utils.route_scoring import LightFirstRouteScorer, RouteScoreResult, get_scorer
from backend.core.database import get_db
from backend.db.models import RouteWeights

router = APIRouter(prefix="/routes", tags=["routes"])


class RouteCandidateInput(BaseModel):
    name: Optional[str] = None
    route: Dict[str, Any] = Field(..., description="GeoJSON LineString or raw route response with leg geometries")
    duration_minutes: Optional[float] = None
    distance_km: Optional[float] = None


class RouteScoreRequest(RouteCandidateInput):
    light_buffer_m: float = Field(default=12.0, ge=1.0, le=100.0)
    sample_spacing_m: float = Field(default=20.0, ge=1.0, le=100.0)
    light_weight: float = Field(default=1.0, ge=0.0, le=1.0, description="Light safety weight (0-1 scale)")
    crime_weight: float = Field(default=1.0, ge=0.0, le=1.0, description="Crime safety weight (0-1 scale)")


class RouteRankRequest(BaseModel):
    routes: List[RouteScoreRequest]


class MapboxDirectionsRequest(BaseModel):
    response: Dict[str, Any]
    route_names: Optional[List[str]] = None
    light_buffer_m: float = Field(default=12.0, ge=1.0, le=100.0)
    sample_spacing_m: float = Field(default=20.0, ge=1.0, le=100.0)
    light_weight: float = Field(default=1.0, ge=0.0, le=1.0, description="Light safety weight (0-1 scale)")
    crime_weight: float = Field(default=1.0, ge=0.0, le=1.0, description="Crime safety weight (0-1 scale)")


class RouteScoreResponse(BaseModel):
    name: Optional[str] = None
    source_route_index: Optional[int] = None
    score: float
    score_percent: float
    coverage: float
    longest_dark_run_ratio: float
    light_points_near_route: int
    crime_points_near_route: int
    light_density_per_km: float
    crime_density_per_km: float
    distance_km: float
    duration_minutes: Optional[float] = None
    notes: List[str]
    geometry: Dict[str, Any]


class RouteRankResponse(BaseModel):
    best_route_index: Optional[int]
    ranked_routes: List[RouteScoreResponse]
    light_data_loaded: bool
    crime_data_loaded: bool


class MapboxRouteRankResponse(BaseModel):
    best_route_index: Optional[int]
    ranked_routes: List[RouteScoreResponse]
    light_data_loaded: bool
    crime_data_loaded: bool
    source: str = "mapbox_directions"


class WeightsResponse(BaseModel):
    light_weight: float = Field(..., ge=0.0, le=1.0, description="Light safety weight (0-1 scale)")
    crime_weight: float = Field(..., ge=0.0, le=1.0, description="Crime safety weight (0-1 scale)")


class WeightsUpdateRequest(BaseModel):
    light_weight: float = Field(..., ge=0.0, le=1.0, description="Light safety weight (0-1 scale)")
    crime_weight: float = Field(..., ge=0.0, le=1.0, description="Crime safety weight (0-1 scale)")


def _load_scorer() -> LightFirstRouteScorer:
    raw_data_dir = os.getenv("ROUTE_DATA_DIR")
    if raw_data_dir:
        data_dir = Path(raw_data_dir)
        if not data_dir.is_absolute():
            data_dir = Path(__file__).resolve().parents[1] / data_dir
    else:
        data_dir = Path(__file__).resolve().parents[1]
    scorer = get_scorer(data_dir)
    scorer.load_data()
    return scorer


@router.on_event("startup")
async def load_route_data() -> None:
    _load_scorer()


@router.post("/score", response_model=RouteScoreResponse)
async def score_route(request: RouteScoreRequest) -> RouteScoreResponse:
    scorer = _load_scorer()
    try:
        result = scorer.score_route(
            request.route,
            name=request.name,
            duration_minutes=request.duration_minutes,
            distance_km=request.distance_km,
            light_buffer_m=request.light_buffer_m,
            sample_spacing_m=request.sample_spacing_m,
            light_weight=request.light_weight,
            crime_weight=request.crime_weight,
        )
        return RouteScoreResponse(**result.__dict__)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to score route: {exc}") from exc


@router.post("/rank", response_model=RouteRankResponse)
async def rank_routes(request: RouteRankRequest) -> RouteRankResponse:
    scorer = _load_scorer()
    scored_routes: List[RouteScoreResult] = []

    try:
        for route_request in request.routes:
            scored_routes.append(
                scorer.score_route(
                    route_request.route,
                    name=route_request.name,
                    duration_minutes=route_request.duration_minutes,
                    distance_km=route_request.distance_km,
                    light_buffer_m=route_request.light_buffer_m,
                    sample_spacing_m=request.sample_spacing_m,
                    light_weight=route_request.light_weight,
                    crime_weight=route_request.crime_weight,
                )
            )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to rank routes: {exc}") from exc

    ranked_with_index = sorted(
        enumerate(scored_routes),
        key=lambda item: item[1].score,
        reverse=True,
    )

    ranked_routes = [
        RouteScoreResponse(**{**result.__dict__, "source_route_index": route_index})
        for route_index, result in ranked_with_index
    ]
    best_route_index = ranked_with_index[0][0] if ranked_with_index else None

    return RouteRankResponse(
        best_route_index=best_route_index,
        ranked_routes=ranked_routes,
        light_data_loaded=scorer._lights is not None and not scorer._lights.empty,
        crime_data_loaded=scorer._crimes is not None and not scorer._crimes.empty,
    )


@router.post("/rank-mapbox", response_model=MapboxRouteRankResponse)
async def rank_mapbox_routes(request: MapboxDirectionsRequest) -> MapboxRouteRankResponse:
    scorer = _load_scorer()
    scored_routes: List[RouteScoreResult] = []

    routes = request.response.get("routes")
    if not isinstance(routes, list) or not routes:
        raise HTTPException(
            status_code=400,
            detail="response must contain a non-empty routes array from the Mapbox Directions API",
        )

    if request.route_names is not None and len(request.route_names) != len(routes):
        raise HTTPException(
            status_code=400,
            detail="route_names must have the same length as routes when provided",
        )

    try:
        for index, route in enumerate(routes):
            route_name = None
            if request.route_names is not None:
                route_name = request.route_names[index]

            scored_routes.append(
                scorer.score_route(
                    route,
                    name=route_name,
                    duration_minutes=route.get("duration", None) / 60.0 if route.get("duration") is not None else None,
                    distance_km=route.get("distance", None) / 1000.0 if route.get("distance") is not None else None,
                    light_buffer_m=request.light_buffer_m,
                    sample_spacing_m=request.sample_spacing_m,
                    light_weight=request.light_weight,
                    crime_weight=request.crime_weight,
                )
            )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to rank Mapbox routes: {exc}") from exc

    ranked_with_index = sorted(
        enumerate(scored_routes),
        key=lambda item: item[1].score,
        reverse=True,
    )

    ranked_routes = [
        RouteScoreResponse(**{**result.__dict__, "source_route_index": route_index})
        for route_index, result in ranked_with_index
    ]
    best_route_index = ranked_with_index[0][0] if ranked_with_index else None

    return MapboxRouteRankResponse(
        best_route_index=best_route_index,
        ranked_routes=ranked_routes,
        light_data_loaded=scorer._lights is not None and not scorer._lights.empty,
        crime_data_loaded=scorer._crimes is not None and not scorer._crimes.empty,
    )


@router.get("/weights", response_model=WeightsResponse)
async def get_weights(db: AsyncSession = Depends(get_db)) -> WeightsResponse:
    """Get current route scoring weights (light and crime)."""
    result = await db.execute(select(RouteWeights).order_by(RouteWeights.id))
    weights = result.scalar_one_or_none()
    
    if weights is None:
        # Return defaults if no weights exist in database
        return WeightsResponse(light_weight=1.0, crime_weight=1.0)
    
    return WeightsResponse(light_weight=weights.light_weight, crime_weight=weights.crime_weight)


@router.put("/weights", response_model=WeightsResponse)
async def update_weights(request: WeightsUpdateRequest, db: AsyncSession = Depends(get_db)) -> WeightsResponse:
    """Update route scoring weights (light and crime)."""
    result = await db.execute(select(RouteWeights).order_by(RouteWeights.id))
    weights = result.scalar_one_or_none()
    
    if weights is None:
        # Create new weights entry if none exists
        weights = RouteWeights(light_weight=request.light_weight, crime_weight=request.crime_weight)
        db.add(weights)
    else:
        # Update existing weights
        weights.light_weight = request.light_weight
        weights.crime_weight = request.crime_weight
    
    await db.commit()
    await db.refresh(weights)
    
    return WeightsResponse(light_weight=weights.light_weight, crime_weight=weights.crime_weight)


@router.get("/health")
async def route_health() -> Dict[str, Any]:
    scorer = _load_scorer()
    light_loaded = scorer._lights is not None and not scorer._lights.empty
    crime_loaded = scorer._crimes is not None and not scorer._crimes.empty
    return {
        "status": "ok",
        "light_data_loaded": light_loaded,
        "crime_data_loaded": crime_loaded,
        "light_data_path": str(scorer.lights_path),
        "crime_data_path": str(scorer.crimes_path),
        "metric_priority": ["light_coverage", "dark_stretch_penalty", "travel_time", "crime_penalty"],
    }