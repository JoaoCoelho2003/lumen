"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";

import { Crosshair, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { type MapRef } from "react-map-gl";
import { useDirections } from "@/hooks/useDirections";
import { useNavigation } from "@/hooks/useNavigation";
import {
  DAY_STYLE_START_HOUR,
  DEFAULT_VIEW_STATE,
  MAP_STYLES,
  MAPBOX_TOKEN,
  NIGHT_STYLE_START_HOUR,
  PORTUGAL_BOUNDS,
  PORTUGAL_TIME_ZONE,
} from "@/lib/constants";
import { calculateBearing, calculateDistance, getBoundsFromCoordinates } from "@/lib/mapbox";
import type {
  Coordinates,
  GeocodingResult,
  NavigationState,
  TravelProfile,
} from "@/lib/types";
import { HeatmapLayer } from "@/components/map/HeatmapLayer";
import { MarkerLayer } from "@/components/map/MarkerLayer";
import { RouteLayer } from "@/components/map/RouteLayer";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { LayerToggles } from "@/components/ui/LayerToggles";
import { NavigationBar } from "@/components/ui/NavigationBar";
import { SearchBar } from "@/components/ui/SearchBar";

function getPortugalHour() {
  const hour = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    hour12: false,
    timeZone: PORTUGAL_TIME_ZONE,
  }).format(new Date());

  return Number(hour);
}

function getTimeBasedMapStyle(hour: number) {
  if (hour >= DAY_STYLE_START_HOUR && hour < NIGHT_STYLE_START_HOUR) {
    return MAP_STYLES.light;
  }

  return MAP_STYLES.dark;
}

export function SafeRouteMap() {
  const mapRef = useRef<MapRef | null>(null);
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [destinationLabel, setDestinationLabel] = useState("");
  const [profile, setProfile] = useState<TravelProfile>("driving");
  const [sheetState, setSheetState] = useState<NavigationState>("idle");
  const [isNavigationSheetExpanded, setIsNavigationSheetExpanded] = useState(false);
  const [satelliteEnabled, setSatelliteEnabled] = useState(false);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [lightingEnabled, setLightingEnabled] = useState(false);
  const [portugalHour, setPortugalHour] = useState(getPortugalHour);
  const [isFocusedOnUser, setIsFocusedOnUser] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const { route, isLoading, error } = useDirections(origin, destination, profile);
  const activeRoute = origin && destination ? route : null;
  const navigation = useNavigation(activeRoute);
  const metricsOptions = {
    performanceMetricsCollection: false,
  };
  const mapStyle = satelliteEnabled
    ? MAP_STYLES.satellite
    : getTimeBasedMapStyle(portugalHour);
  const activeStep = activeRoute?.steps[navigation.stepIndex] ?? null;
  const distanceToNextManeuver = useMemo(() => {
    if (!activeStep || !navigation.position) {
      return 0;
    }

    return calculateDistance(navigation.position.coordinates, activeStep.maneuver.location);
  }, [activeStep, navigation.position]);
  const durationRemaining = activeRoute
    ? (navigation.distanceRemaining / Math.max(activeRoute.distance, 1)) * activeRoute.duration
    : 0;
  const routeError = navigation.error ?? error;

  useEffect(() => {
    if (activeRoute && sheetState !== "navigating") {
      const previewTransition = window.setTimeout(() => {
        setSheetState("preview");
      }, 0);

      return () => window.clearTimeout(previewTransition);
    }

    return undefined;
  }, [activeRoute, sheetState]);

  useEffect(() => {
    if (!activeRoute || activeRoute.geometry.coordinates.length === 0 || !mapRef.current) {
      return;
    }

    const bounds = getBoundsFromCoordinates(activeRoute.geometry.coordinates);
    const focusReset = window.setTimeout(() => {
      setIsFocusedOnUser(false);
    }, 0);
    mapRef.current.fitBounds(
      [
        [bounds.minLng, bounds.minLat],
        [bounds.maxLng, bounds.maxLat],
      ],
      {
        padding: {
          top: 110,
          right: 80,
          bottom: 220,
          left: 80,
        },
        duration: 900,
      },
    );

    return () => window.clearTimeout(focusReset);
  }, [activeRoute]);

  useEffect(() => {
    if (!navigation.cameraTarget || !mapRef.current || !isFocusedOnUser) {
      return;
    }

    mapRef.current.easeTo({
      center: navigation.cameraTarget.center,
      bearing: navigation.cameraTarget.bearing,
      pitch: navigation.cameraTarget.pitch,
      zoom: navigation.cameraTarget.zoom,
      duration: 700,
    });
  }, [isFocusedOnUser, navigation.cameraTarget]);

  useEffect(() => {
    if (navigation.error) {
      const previewTransition = window.setTimeout(() => {
        setSheetState(activeRoute ? "preview" : "idle");
      }, 0);

      return () => window.clearTimeout(previewTransition);
    }

    return undefined;
  }, [activeRoute, navigation.error]);

  useEffect(() => {
    const clock = window.setInterval(() => {
      setPortugalHour(getPortugalHour());
    }, 60_000);

    return () => window.clearInterval(clock);
  }, []);

  function handleDestinationSelect(result: GeocodingResult) {
    setDestination(result.center);
    setDestinationLabel(result.place_name);
  }

  function handleStartJourney() {
    if (!activeRoute || activeRoute.geometry.coordinates.length === 0) {
      return;
    }

    const startCoordinates = origin ?? activeRoute.geometry.coordinates[0];
    const startBearing = navigation.position?.bearing ?? calculateBearing(
      activeRoute.geometry.coordinates[0],
      activeRoute.geometry.coordinates[1] ?? activeRoute.geometry.coordinates[0],
    );

    mapRef.current?.easeTo({
      center: startCoordinates,
      pitch: 60,
      bearing: startBearing,
      zoom: 16,
      duration: 450,
    });
    setIsFocusedOnUser(true);
    setSheetState("navigating");
    setIsNavigationSheetExpanded(false);
    navigation.startNavigation(startCoordinates);
  }

  const handleUseMyLocation = useCallback((coordinates: Coordinates) => {
    setOrigin(coordinates);
    setIsFocusedOnUser(true);
    setLocationError(null);
    mapRef.current?.easeTo({
      center: coordinates,
      zoom: 15.5,
      pitch: 45,
      bearing: 0,
      duration: 900,
    });
  }, []);

  const requestMyLocation = useCallback(() => {
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Your browser does not support location access.");
      return;
    }

    if (!window.isSecureContext) {
      setLocationError("GPS requires HTTPS on mobile browsers. Use HTTPS or test on localhost.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (location) => {
        handleUseMyLocation([location.coords.longitude, location.coords.latitude]);
        setIsLocating(false);
      },
      () => {
        setLocationError("Could not get your location. Check browser permissions.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  }, [handleUseMyLocation]);

  const recenterOnUser = useCallback(() => {
    if (sheetState === "navigating" && navigation.position) {
      setIsFocusedOnUser(true);
      mapRef.current?.easeTo({
        center: navigation.position.coordinates,
        bearing: navigation.position.bearing,
        pitch: 60,
        zoom: 16,
        duration: 700,
      });
      return;
    }

    requestMyLocation();
  }, [navigation.position, requestMyLocation, sheetState]);

  useEffect(() => {
    const initialLocationRequest = window.setTimeout(() => {
      requestMyLocation();
    }, 0);

    return () => window.clearTimeout(initialLocationRequest);
  }, [requestMyLocation]);

  function handleStopNavigation() {
    const currentCoordinates = navigation.position?.coordinates ?? origin;

    navigation.stopNavigation();
    setSheetState("idle");
    setIsNavigationSheetExpanded(false);
    setDestination(null);
    setDestinationLabel("");

    if (currentCoordinates) {
      setOrigin(currentCoordinates);
      setIsFocusedOnUser(true);
      mapRef.current?.easeTo({
        center: currentCoordinates,
        zoom: 15.5,
        pitch: 45,
        bearing: 0,
        duration: 900,
      });
      return;
    }

    setOrigin(null);
    setIsFocusedOnUser(false);
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-black text-white">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={DEFAULT_VIEW_STATE}
        mapStyle={mapStyle}
        maxBounds={PORTUGAL_BOUNDS}
        minZoom={4.3}
        attributionControl
        reuseMaps
        {...metricsOptions}
        style={{ width: "100%", height: "100%" }}
        onMoveStart={(event) => {
          if (event.originalEvent) {
            setIsFocusedOnUser(false);
          }
        }}
      >
        <HeatmapLayer enabled={lightingEnabled} />
        <RouteLayer route={activeRoute} distanceTravelled={navigation.distanceTravelled} />
        <MarkerLayer origin={origin} destination={destination} position={navigation.position} />
      </Map>

      {!MAPBOX_TOKEN ? (
        <div className="pointer-events-auto fixed left-1/2 top-4 z-50 w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-red-400/30 bg-red-950/90 px-4 py-3 text-sm text-red-100 shadow-2xl backdrop-blur-md">
          NEXT_PUBLIC_MAPBOX_TOKEN is missing. Add it to .env.local and restart the dev server.
        </div>
      ) : null}

      {sheetState === "idle" ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 px-3">
          <div className="pointer-events-auto mx-auto max-w-2xl">
            <SearchBar
              destinationLabel={destinationLabel}
              error={routeError}
              onDestinationLabelChange={setDestinationLabel}
              onDestinationSelect={handleDestinationSelect}
              onDestinationCoordinatesChange={setDestination}
            />
          </div>
        </div>
      ) : null}

      {!isFocusedOnUser ? (
        <button
          type="button"
          onClick={recenterOnUser}
          className="pointer-events-auto fixed left-3 top-1/2 z-50 flex h-12 w-12 -translate-y-32 items-center justify-center rounded-2xl border border-white/10 bg-[#0f1117]/95 text-blue-100 shadow-2xl backdrop-blur-md transition-all duration-300 ease-out hover:bg-blue-500/20"
          aria-label="Recenter on my location"
          title="Recenter"
        >
          {isLocating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Crosshair className="h-5 w-5" />
          )}
        </button>
      ) : null}

      {locationError ? (
        <div className="pointer-events-none fixed left-16 top-1/2 z-50 max-w-[min(18rem,calc(100vw-5rem))] -translate-y-32 rounded-2xl border border-red-400/30 bg-red-950/90 px-3 py-2 text-xs text-red-100 shadow-2xl backdrop-blur-md">
          {locationError}
        </div>
      ) : null}

      {sheetState === "navigating" ? (
        <NavigationBar step={activeStep} distanceToNextManeuver={distanceToNextManeuver} />
      ) : null}

      <LayerToggles
        satelliteEnabled={satelliteEnabled}
        heatmapEnabled={heatmapEnabled}
        lightingEnabled={lightingEnabled}
        onSatelliteToggle={() => setSatelliteEnabled((enabled) => !enabled)}
        onHeatmapToggle={() => setHeatmapEnabled((enabled) => !enabled)}
        onLightingToggle={() => setLightingEnabled((enabled) => !enabled)}
      />

      <BottomSheet
        state={sheetState}
        route={activeRoute}
        destinationName={destinationLabel}
        profile={profile}
        isLoadingRoute={isLoading}
        error={routeError}
        isExpanded={isNavigationSheetExpanded}
        distanceRemaining={navigation.distanceRemaining}
        durationRemaining={durationRemaining}
        activeStepIndex={navigation.stepIndex}
        onToggleExpanded={() => setIsNavigationSheetExpanded((expanded) => !expanded)}
        onProfileChange={setProfile}
        onStartJourney={handleStartJourney}
        onStopNavigation={handleStopNavigation}
      />
    </main>
  );
}
