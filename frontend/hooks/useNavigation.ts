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
  TravelProfile,
} from "@/lib/types";

type NavigationHook = {
  position: NavigationPosition | null;
  stepIndex: number;
  distanceTravelled: number;
  distanceRemaining: number;
  isNavigating: boolean;
  isFinished: boolean;
  error: string | null;
  prepareCompassTracking: () => Promise<void>;
  startNavigation: (initialCoordinates?: Coordinates) => void;
  stopNavigation: () => void;
  cameraTarget: CameraTarget | null;
};

type DeviceOrientationEventWithCompass = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

type DeviceOrientationEventConstructorWithPermission =
  typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<PermissionState>;
  };

function normalizeBearing(bearing: number) {
  return (bearing + 360) % 360;
}

function getBearingDelta(first: number, second: number) {
  return Math.abs((((first - second + 180) % 360) + 360) % 360 - 180);
}

function getCompassBearing(event: DeviceOrientationEventWithCompass) {
  if (typeof event.webkitCompassHeading === "number") {
    return normalizeBearing(event.webkitCompassHeading);
  }

  if (event.absolute && typeof event.alpha === "number") {
    return normalizeBearing(360 - event.alpha);
  }

  return null;
}

async function requestCompassPermission() {
  const DeviceOrientation =
    window.DeviceOrientationEvent as
      | DeviceOrientationEventConstructorWithPermission
      | undefined;

  if (DeviceOrientation?.requestPermission) {
    try {
      const permission = await DeviceOrientation.requestPermission();

      return permission === "granted";
    } catch {
      return false;
    }
  }

  return "DeviceOrientationEvent" in window;
}

export function useNavigation(
  route: Route | null,
  profile: TravelProfile,
): NavigationHook {
  const [position, setPosition] = useState<NavigationPosition | null>(null);
  const [distanceTravelled, setDistanceTravelled] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const previousCoordinatesRef = useRef<Coordinates | null>(null);
  const compassBearingRef = useRef<number | null>(null);
  const compassPermissionGrantedRef = useRef(false);
  const compassAnimationFrameRef = useRef<number | null>(null);
  const lastCompassUpdateRef = useRef({
    bearing: null as number | null,
    timestamp: 0,
  });
  const removeCompassListenerRef = useRef<(() => void) | null>(null);

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

  const clearCompassListener = useCallback(() => {
    removeCompassListenerRef.current?.();
    removeCompassListenerRef.current = null;
    if (compassAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(compassAnimationFrameRef.current);
      compassAnimationFrameRef.current = null;
    }
    compassBearingRef.current = null;
    lastCompassUpdateRef.current = { bearing: null, timestamp: 0 };
  }, []);

  const stopNavigation = useCallback(() => {
    clearPositionWatch();
    clearCompassListener();
    setPosition(null);
    setDistanceTravelled(0);
    setIsNavigating(false);
    setIsFinished(false);
    setError(null);
    previousCoordinatesRef.current = null;
  }, [clearCompassListener, clearPositionWatch]);

  const prepareCompassTracking = useCallback(async () => {
    if (compassPermissionGrantedRef.current) {
      return;
    }

    const permissionGranted = await requestCompassPermission();
    compassPermissionGrantedRef.current = permissionGranted;
  }, []);

  const startCompassTracking = useCallback(async () => {
    if (profile !== "walking") {
      return;
    }

    await prepareCompassTracking();

    if (!compassPermissionGrantedRef.current) {
      return;
    }

    const handleDeviceOrientation = (
      event: DeviceOrientationEventWithCompass,
    ) => {
      const compassBearing = getCompassBearing(event);

      if (compassBearing === null) {
        return;
      }

      compassBearingRef.current = compassBearing;

      if (compassAnimationFrameRef.current !== null) {
        return;
      }

      compassAnimationFrameRef.current = window.requestAnimationFrame(() => {
        compassAnimationFrameRef.current = null;

        const nextBearing = compassBearingRef.current;

        if (nextBearing === null) {
          return;
        }

        const lastUpdate = lastCompassUpdateRef.current;
        const now = performance.now();
        const changedEnough =
          lastUpdate.bearing === null ||
          getBearingDelta(nextBearing, lastUpdate.bearing) >= 4;
        const waitedEnough = now - lastUpdate.timestamp >= 120;

        if (!changedEnough && !waitedEnough) {
          return;
        }

        lastCompassUpdateRef.current = {
          bearing: nextBearing,
          timestamp: now,
        };
        setPosition((currentPosition) =>
          currentPosition
            ? {
                ...currentPosition,
                bearing: nextBearing,
              }
            : currentPosition,
        );
      });
    };

    window.addEventListener("deviceorientationabsolute", handleDeviceOrientation);
    window.addEventListener("deviceorientation", handleDeviceOrientation);
    removeCompassListenerRef.current = () => {
      window.removeEventListener(
        "deviceorientationabsolute",
        handleDeviceOrientation,
      );
      window.removeEventListener("deviceorientation", handleDeviceOrientation);
    };
  }, [prepareCompassTracking, profile]);

  const startNavigation = useCallback(
    (initialCoordinates?: Coordinates) => {
      if (!route || route.geometry.coordinates.length === 0) {
        return;
      }

      if (!navigator.geolocation) {
        setError("Your browser does not support GPS location.");
        return;
      }

      if (!window.isSecureContext) {
        setError(
          "GPS requires HTTPS on mobile browsers. Use HTTPS or test on localhost.",
        );
        return;
      }

      clearPositionWatch();
      clearCompassListener();
      previousCoordinatesRef.current = null;
      setError(null);
      setIsFinished(false);
      setIsNavigating(true);
      void startCompassTracking();

      if (initialCoordinates) {
        const initialDistanceTravelled = Math.min(
          routeDistance,
          findDistanceAlongRoute(
            route.geometry.coordinates,
            initialCoordinates,
          ),
        );
        const initialBearing = getBearingAtDistance(
          route.geometry.coordinates,
          initialDistanceTravelled,
        );
        const initialStepIndex = findClosestStepIndex(
          route.steps,
          initialCoordinates,
        );
        const bearing = compassBearingRef.current ?? initialBearing;

        previousCoordinatesRef.current = initialCoordinates;
        setDistanceTravelled(initialDistanceTravelled);
        setPosition({
          coordinates: initialCoordinates,
          bearing,
          cameraBearing: initialBearing,
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
          const movementBearing = hasUsefulMovement
            ? calculateBearing(previousCoordinates, nextCoordinates)
            : null;
          const routeBearing = getBearingAtDistance(
            route.geometry.coordinates,
            nextDistanceTravelled,
          );
          const gpsBearing =
            typeof gpsPosition.coords.heading === "number"
              ? normalizeBearing(gpsPosition.coords.heading)
              : null;
          const bearing =
            profile === "walking"
              ? (compassBearingRef.current ??
                gpsBearing ??
                movementBearing ??
                routeBearing)
              : (movementBearing ?? gpsBearing ?? routeBearing);
          const cameraBearing =
            profile === "walking" ? routeBearing : bearing;
          const closestStepIndex = findClosestStepIndex(
            route.steps,
            nextCoordinates,
          );

          previousCoordinatesRef.current = nextCoordinates;
          setDistanceTravelled(nextDistanceTravelled);
          setPosition({
            coordinates: nextCoordinates,
            bearing,
            cameraBearing,
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
            clearCompassListener();
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
    },
    [
      clearCompassListener,
      clearPositionWatch,
      profile,
      route,
      routeDistance,
      startCompassTracking,
    ],
  );

  useEffect(() => {
    return () => {
      clearPositionWatch();
      clearCompassListener();
    };
  }, [clearCompassListener, clearPositionWatch]);

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
      bearing: position.cameraBearing,
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
    prepareCompassTracking,
    startNavigation,
    stopNavigation,
    cameraTarget,
  };
}
