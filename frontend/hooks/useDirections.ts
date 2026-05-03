"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRankMapboxRoutes } from "@/app/api/queries/routes";
import { MAPBOX_TOKEN } from "../lib/constants";
import { mapboxRouteToRoute } from "../lib/mapbox";
import type {
  Coordinates,
  MapboxDirectionsRoute,
  MapboxDirectionsResponse,
  RankedRoute,
  Route,
  RouteWeights,
  TravelProfile,
} from "../lib/types";

const MAX_RANKED_ROUTES = 10;
const DIVERSIFIED_ROUTE_OFFSETS_METERS = [350, -350, 700, -700];

function offsetCoordinate(
  origin: Coordinates,
  destination: Coordinates,
  offsetMeters: number,
): Coordinates {
  const midLng = (origin[0] + destination[0]) / 2;
  const midLat = (origin[1] + destination[1]) / 2;
  const dx = destination[0] - origin[0];
  const dy = destination[1] - origin[1];
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const perpendicularLng = -dy / length;
  const perpendicularLat = dx / length;
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng =
    metersPerDegreeLat * Math.max(Math.cos((midLat * Math.PI) / 180), 0.2);

  return [
    midLng + (perpendicularLng * offsetMeters) / metersPerDegreeLng,
    midLat + (perpendicularLat * offsetMeters) / metersPerDegreeLat,
  ];
}

function routeKey(route: MapboxDirectionsRoute) {
  return route.geometry.coordinates
    .filter((_, index) => index % 8 === 0)
    .map(([lng, lat]) => `${lng.toFixed(5)},${lat.toFixed(5)}`)
    .join("|");
}

type DirectionsState = {
  route: Route | null;
  rankedRoutes: RankedRoute[];
  selectedRouteIndex: number | null;
  isLoading: boolean;
  error: string | null;
  selectRouteByIndex: (index: number) => void;
};

export function useDirections(
  origin: Coordinates | null,
  destination: Coordinates | null,
  profile: TravelProfile,
  weights: RouteWeights,
): DirectionsState {
  const [route, setRoute] = useState<Route | null>(null);
  const [rankedRoutes, setRankedRoutes] = useState<RankedRoute[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapboxRoutes, setMapboxRoutes] = useState<MapboxDirectionsRoute[]>([]);
  const rankRequest = useMemo(
    () =>
      mapboxRoutes.length > 0
        ? {
            routes: mapboxRoutes,
            light_weight: weights.light_weight,
            crime_weight: weights.crime_weight,
            sample_spacing_m: 50,
          }
        : null,
    [mapboxRoutes, weights.crime_weight, weights.light_weight],
  );
  const rankQuery = useRankMapboxRoutes(rankRequest);

  useEffect(() => {
    if (!origin || !destination) {
      const reset = window.setTimeout(() => {
        setRoute(null);
        setRankedRoutes([]);
        setSelectedRouteIndex(null);
        setMapboxRoutes([]);
        setIsLoading(false);
        setError(null);
      }, 0);

      return () => window.clearTimeout(reset);
    }

    if (!MAPBOX_TOKEN) {
      const reset = window.setTimeout(() => {
        setRoute(null);
        setRankedRoutes([]);
        setSelectedRouteIndex(null);
        setMapboxRoutes([]);
        setIsLoading(false);
        setError("Configure NEXT_PUBLIC_MAPBOX_TOKEN to calculate routes.");
      }, 0);

      return () => window.clearTimeout(reset);
    }

    const currentOrigin = origin;
    const currentDestination = destination;
    const controller = new AbortController();

    async function fetchRoute() {
      setIsLoading(true);
      setRoute(null);
      setError(null);

      try {
        async function fetchDirections(coordinates: string, alternatives: boolean) {
          const params = new URLSearchParams({
            geometries: "geojson",
            steps: "true",
            overview: "full",
            alternatives: alternatives ? "true" : "false",
            access_token: MAPBOX_TOKEN,
            language: "pt",
          });
          const response = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?${params.toString()}`,
            { signal: controller.signal },
          );
          const data = (await response.json()) as MapboxDirectionsResponse;

          if (!response.ok) {
            throw new Error(data.message ?? "Could not calculate the route.");
          }

          return data.routes ?? [];
        }

        const directCoordinates = `${currentOrigin[0]},${currentOrigin[1]};${currentDestination[0]},${currentDestination[1]}`;
        const directRoutes = await fetchDirections(directCoordinates, true);
        const detourRouteGroups = await Promise.all(
          DIVERSIFIED_ROUTE_OFFSETS_METERS.map((offsetMeters) => {
            const waypoint = offsetCoordinate(
              currentOrigin,
              currentDestination,
              offsetMeters,
            );
            const coordinates = `${currentOrigin[0]},${currentOrigin[1]};${waypoint[0]},${waypoint[1]};${currentDestination[0]},${currentDestination[1]}`;
            return fetchDirections(coordinates, false).catch(() => []);
          }),
        );
        const allRoutes = [...directRoutes, ...detourRouteGroups.flat()];

        const firstRoute = allRoutes[0];

        if (!firstRoute) {
          throw new Error("No route found for those locations.");
        }

        const seenRouteKeys = new Set<string>();
        const nextRoutes = allRoutes
          .filter((candidate) => {
            const key = routeKey(candidate);
            if (seenRouteKeys.has(key)) {
              return false;
            }

            seenRouteKeys.add(key);
            return true;
          })
          .slice(0, MAX_RANKED_ROUTES);

        setMapboxRoutes(nextRoutes);
        setRankedRoutes([]);
        setSelectedRouteIndex(0);
        setRoute(mapboxRouteToRoute(firstRoute));
      } catch (routeError) {
        if (
          routeError instanceof DOMException &&
          routeError.name === "AbortError"
        ) {
          return;
        }

        setRoute(null);
        setRankedRoutes([]);
        setSelectedRouteIndex(null);
        setMapboxRoutes([]);
        setError(
          routeError instanceof Error
            ? routeError.message
            : "Could not calculate route.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void fetchRoute();

    return () => {
      controller.abort();
    };
  }, [destination, origin, profile]);

  useEffect(() => {
    const ranked = rankQuery.data;

    if (!ranked) {
      return;
    }

    const nextSelectedIndex =
      ranked.best_route_index ?? ranked.ranked_routes[0]?.source_route_index ?? 0;

    const syncRankedRoute = window.setTimeout(() => {
      setRankedRoutes(ranked.ranked_routes.slice(0, 10));
      setSelectedRouteIndex(nextSelectedIndex);

      const selected = mapboxRoutes[nextSelectedIndex];
      setRoute(selected ? mapboxRouteToRoute(selected) : null);
    }, 0);

    return () => window.clearTimeout(syncRankedRoute);
  }, [mapboxRoutes, rankQuery.data]);

  useEffect(() => {
    if (!rankQuery.error) {
      return;
    }

    const syncRankError = window.setTimeout(() => {
      setError(
        rankQuery.error instanceof Error
          ? rankQuery.error.message
          : "Could not rank route alternatives.",
      );
      setRankedRoutes([]);
    }, 0);

    return () => window.clearTimeout(syncRankError);
  }, [rankQuery.error]);

  const selectRouteByIndex = useCallback(
    (index: number) => {
      setSelectedRouteIndex(index);
      const selected = mapboxRoutes[index];
      setRoute(selected ? mapboxRouteToRoute(selected) : null);
    },
    [mapboxRoutes],
  );

  return {
    route,
    rankedRoutes,
    selectedRouteIndex,
    isLoading: isLoading || rankQuery.isFetching,
    error,
    selectRouteByIndex,
  };
}
