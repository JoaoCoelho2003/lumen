"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NAVIGATION_CAMERA } from "@/lib/constants";
import {
  calculateBearing,
  calculateDistance,
  calculateRouteDistance,
  findDistanceAlongRoute,
  findClosestStepIndex,
  getBearingAtDistance,
} from "@/lib/mapbox";
import type {
  Coordinates,
  CameraTarget,
  NavigationPosition,
  Route,
} from "@/lib/types";

type NavigationHook = {
  position: NavigationPosition | null;
  stepIndex: number;
  distanceTravelled: number;
  distanceRemaining: number;
  isNavigating: boolean;
  isFinished: boolean;
  error: string | null;
  startNavigation: (initialCoordinates?: Coordinates) => void;
  stopNavigation: () => void;
  cameraTarget: CameraTarget | null;
};

export function useNavigation(route: Route | null): NavigationHook {
  const [position, setPosition] = useState<NavigationPosition | null>(null);
  const [distanceTravelled, setDistanceTravelled] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const previousCoordinatesRef = useRef<Coordinates | null>(null);

  const routeDistance = useMemo(() => {
    if (!route) {
      return 0;
    }

    return calculateRouteDistance(route.geometry.coordinates);
  }, [route]);

  const clearPositionWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const stopNavigation = useCallback(() => {
    clearPositionWatch();
    setPosition(null);
    setDistanceTravelled(0);
    setIsNavigating(false);
    setIsFinished(false);
    setError(null);
    previousCoordinatesRef.current = null;
  }, [clearPositionWatch]);

  const startNavigation = useCallback((initialCoordinates?: Coordinates) => {
    if (!route || route.geometry.coordinates.length === 0) {
      return;
    }

    if (!navigator.geolocation) {
      setError("Your browser does not support GPS location.");
      return;
    }

    if (!window.isSecureContext) {
      setError("GPS requires HTTPS on mobile browsers. Use HTTPS or test on localhost.");
      return;
    }

    clearPositionWatch();
    previousCoordinatesRef.current = null;
    setError(null);
    setIsFinished(false);
    setIsNavigating(true);

    if (initialCoordinates) {
      const initialDistanceTravelled = Math.min(
        routeDistance,
        findDistanceAlongRoute(route.geometry.coordinates, initialCoordinates),
      );
      const initialBearing = getBearingAtDistance(
        route.geometry.coordinates,
        initialDistanceTravelled,
      );
      const initialStepIndex = findClosestStepIndex(route.steps, initialCoordinates);

      previousCoordinatesRef.current = initialCoordinates;
      setDistanceTravelled(initialDistanceTravelled);
      setPosition({
        coordinates: initialCoordinates,
        bearing: initialBearing,
        stepIndex: initialStepIndex,
        distanceTravelled: initialDistanceTravelled,
      });
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (gpsPosition) => {
        const nextCoordinates: Coordinates = [
          gpsPosition.coords.longitude,
          gpsPosition.coords.latitude,
        ];
        const nextDistanceTravelled = Math.min(
          routeDistance,
          findDistanceAlongRoute(route.geometry.coordinates, nextCoordinates),
        );
        const previousCoordinates = previousCoordinatesRef.current;
        const hasUsefulMovement =
          previousCoordinates !== null &&
          calculateDistance(previousCoordinates, nextCoordinates) >= 2;
        const bearing = hasUsefulMovement
          ? calculateBearing(previousCoordinates, nextCoordinates)
          : getBearingAtDistance(route.geometry.coordinates, nextDistanceTravelled);
        const closestStepIndex = findClosestStepIndex(route.steps, nextCoordinates);

        previousCoordinatesRef.current = nextCoordinates;
        setDistanceTravelled(nextDistanceTravelled);
        setPosition({
          coordinates: nextCoordinates,
          bearing,
          stepIndex: closestStepIndex,
          distanceTravelled: nextDistanceTravelled,
        });

        if (
          route.geometry.coordinates.length > 0 &&
          calculateDistance(
            nextCoordinates,
            route.geometry.coordinates[route.geometry.coordinates.length - 1],
          ) < 25
        ) {
          clearPositionWatch();
          setIsNavigating(false);
          setIsFinished(true);
        }
      },
      (locationError) => {
        clearPositionWatch();
        setIsNavigating(false);
        setError(
          locationError.code === locationError.PERMISSION_DENIED
            ? "Location permission was denied. Allow location access in the browser to navigate."
            : "Could not get your GPS location. Check location services and browser permissions.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 0,
      },
    );
  }, [clearPositionWatch, route, routeDistance]);

  useEffect(() => {
    return () => {
      clearPositionWatch();
    };
  }, [clearPositionWatch]);

  useEffect(() => {
    const reset = window.setTimeout(() => {
      stopNavigation();
    }, 0);

    return () => {
      window.clearTimeout(reset);
    };
  }, [route, stopNavigation]);

  const cameraTarget = useMemo<CameraTarget | null>(() => {
    if (!position) {
      return null;
    }

    return {
      center: position.coordinates,
      bearing: position.bearing,
      pitch: NAVIGATION_CAMERA.pitch,
      zoom: NAVIGATION_CAMERA.zoom,
    };
  }, [position]);

  return {
    position,
    stepIndex: position?.stepIndex ?? 0,
    distanceTravelled,
    distanceRemaining: Math.max(0, routeDistance - distanceTravelled),
    isNavigating,
    isFinished,
    error,
    startNavigation,
    stopNavigation,
    cameraTarget,
  };
}
