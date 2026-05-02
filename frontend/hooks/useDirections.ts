"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchBackendJson } from "../lib/backend";
import { MAPBOX_TOKEN } from "../lib/constants";
import { mapboxRouteToRoute } from "../lib/mapbox";
import type {
  Coordinates,
  MapboxDirectionsRoute,
  MapboxDirectionsResponse,
  MapboxRouteRankResponse,
  RankedRoute,
  Route,
  RouteWeights,
  TravelProfile,
} from "../lib/types";

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
        const coordinates = `${currentOrigin[0]},${currentOrigin[1]};${currentDestination[0]},${currentDestination[1]}`;
        const params = new URLSearchParams({
          geometries: "geojson",
          steps: "true",
          overview: "full",
          alternatives: "true",
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

        const firstRoute = data.routes?.[0];

        if (!firstRoute) {
          throw new Error("No route found for those locations.");
        }

        const nextRoutes = (data.routes ?? []).slice(0, 3);

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
    if (!mapboxRoutes.length) {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function rankRoutes() {
      setIsLoading(true);

      try {
        const ranked = await fetchBackendJson<MapboxRouteRankResponse>(
          "/routes/rank-mapbox",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              response: { routes: mapboxRoutes },
              light_weight: weights.light_weight,
              crime_weight: weights.crime_weight,
              sample_spacing_m: 50,
            }),
            signal: controller.signal,
          },
        );

        if (cancelled) {
          return;
        }

        const nextSelectedIndex =
          ranked.best_route_index ??
          ranked.ranked_routes[0]?.source_route_index ??
          0;

        setRankedRoutes(ranked.ranked_routes.slice(0, 10));

        setSelectedRouteIndex(nextSelectedIndex);

        const selected = mapboxRoutes[nextSelectedIndex];
        setRoute(selected ? mapboxRouteToRoute(selected) : null);
      } catch (rankError) {
        if (
          rankError instanceof DOMException &&
          rankError.name === "AbortError"
        ) {
          return;
        }

        if (!cancelled) {
          setError(
            rankError instanceof Error
              ? rankError.message
              : "Could not rank route alternatives.",
          );
          setRankedRoutes([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void rankRoutes();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [mapboxRoutes, weights.crime_weight, weights.light_weight]);

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
    isLoading,
    error,
    selectRouteByIndex,
  };
}
