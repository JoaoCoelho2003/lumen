"use client";

import { useEffect, useState } from "react";
import { MAPBOX_TOKEN } from "@/lib/constants";
import type {
  Coordinates,
  MapboxDirectionsResponse,
  Route,
  RouteStep,
  TravelProfile,
} from "@/lib/types";

type DirectionsState = {
  route: Route | null;
  isLoading: boolean;
  error: string | null;
};

export function useDirections(
  origin: Coordinates | null,
  destination: Coordinates | null,
  profile: TravelProfile,
): DirectionsState {
  const [route, setRoute] = useState<Route | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!origin || !destination) {
      const reset = window.setTimeout(() => {
        setRoute(null);
        setIsLoading(false);
        setError(null);
      }, 0);

      return () => window.clearTimeout(reset);
    }

    if (!MAPBOX_TOKEN) {
      const reset = window.setTimeout(() => {
        setRoute(null);
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
      setError(null);

      try {
        const coordinates = `${currentOrigin[0]},${currentOrigin[1]};${currentDestination[0]},${currentDestination[1]}`;
        const params = new URLSearchParams({
          geometries: "geojson",
          steps: "true",
          overview: "full",
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

        const steps: RouteStep[] = firstRoute.legs.flatMap((leg) =>
          leg.steps.map((step) => ({
            instruction: step.maneuver.instruction ?? "Continue",
            maneuver: {
              type: step.maneuver.type,
              modifier: step.maneuver.modifier,
              location: step.maneuver.location,
            },
            distance: step.distance,
            duration: step.duration,
          })),
        );

        setRoute({
          geometry: firstRoute.geometry,
          steps,
          distance: firstRoute.distance,
          duration: firstRoute.duration,
        });
      } catch (routeError) {
        if (routeError instanceof DOMException && routeError.name === "AbortError") {
          return;
        }

        setRoute(null);
        setError(routeError instanceof Error ? routeError.message : "Could not calculate route.");
      } finally {
        setIsLoading(false);
      }
    }

    void fetchRoute();

    return () => {
      controller.abort();
    };
  }, [destination, origin, profile]);

  return { route, isLoading, error };
}
