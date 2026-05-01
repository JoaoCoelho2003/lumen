"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [originLabel, setOriginLabel] = useState("");
  const [destinationLabel, setDestinationLabel] = useState("");
  const [profile, setProfile] = useState<TravelProfile>("driving");
  const [sheetState, setSheetState] = useState<NavigationState>("idle");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isNavigationSheetExpanded, setIsNavigationSheetExpanded] = useState(false);
  const [satelliteEnabled, setSatelliteEnabled] = useState(false);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [lightingEnabled, setLightingEnabled] = useState(false);
  const [portugalHour, setPortugalHour] = useState(getPortugalHour);

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
    mapRef.current.fitBounds(
      [
        [bounds.minLng, bounds.minLat],
        [bounds.maxLng, bounds.maxLat],
      ],
      {
        padding: 80,
        duration: 900,
      },
    );
  }, [activeRoute]);

  useEffect(() => {
    if (!navigation.cameraTarget || !mapRef.current) {
      return;
    }

    mapRef.current.easeTo({
      center: navigation.cameraTarget.center,
      bearing: navigation.cameraTarget.bearing,
      pitch: navigation.cameraTarget.pitch,
      zoom: navigation.cameraTarget.zoom,
      duration: 700,
    });
  }, [navigation.cameraTarget]);

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

  function handleOriginSelect(result: GeocodingResult) {
    setOrigin(result.center);
    setOriginLabel(result.place_name);
    setIsSearchExpanded(true);
  }

  function handleDestinationSelect(result: GeocodingResult) {
    setDestination(result.center);
    setDestinationLabel(result.place_name);
    setIsSearchExpanded(true);
  }

  function handleStartJourney() {
    if (!activeRoute || activeRoute.geometry.coordinates.length === 0) {
      return;
    }

    const first = activeRoute.geometry.coordinates[0];
    const second = activeRoute.geometry.coordinates[1] ?? first;

    mapRef.current?.easeTo({
      center: first,
      pitch: 60,
      bearing: calculateBearing(first, second),
      zoom: 16,
      duration: 900,
    });
    setSheetState("navigating");
    setIsSearchExpanded(false);
    setIsNavigationSheetExpanded(false);
    navigation.startNavigation();
  }

  function handleStopNavigation() {
    navigation.stopNavigation();
    setSheetState("idle");
    setIsSearchExpanded(false);
    setIsNavigationSheetExpanded(false);
    setOrigin(null);
    setDestination(null);
    setOriginLabel("");
    setDestinationLabel("");
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-black text-white">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={DEFAULT_VIEW_STATE}
        mapStyle={mapStyle}
        maxBounds={PORTUGAL_BOUNDS}
        minZoom={5}
        attributionControl
        reuseMaps
        {...metricsOptions}
        style={{ width: "100%", height: "100%" }}
      >
        <RouteLayer route={activeRoute} distanceTravelled={navigation.distanceTravelled} />
        <MarkerLayer origin={origin} destination={destination} position={navigation.position} />
      </Map>

      {!MAPBOX_TOKEN ? (
        <div className="pointer-events-auto fixed left-1/2 top-4 z-50 w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-red-400/30 bg-red-950/90 px-4 py-3 text-sm text-red-100 shadow-2xl backdrop-blur-md">
          NEXT_PUBLIC_MAPBOX_TOKEN is missing. Add it to .env.local and restart the dev server.
        </div>
      ) : null}

      {sheetState !== "navigating" && isSearchExpanded ? (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-40 px-3">
          <div className="pointer-events-auto mx-auto max-w-2xl">
            <SearchBar
              originLabel={originLabel}
              destinationLabel={destinationLabel}
              onOriginLabelChange={setOriginLabel}
              onDestinationLabelChange={setDestinationLabel}
              onOriginSelect={handleOriginSelect}
              onDestinationSelect={handleDestinationSelect}
              onOriginCoordinatesChange={setOrigin}
              onDestinationCoordinatesChange={setDestination}
              onUseMyLocation={(coordinates, label) => {
                setOrigin(coordinates);
                setOriginLabel(label);
                setIsSearchExpanded(true);
              }}
            />
          </div>
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
        onExpandSearch={() => {
          setIsSearchExpanded(true);
          setSheetState(activeRoute ? "preview" : "idle");
        }}
        onToggleExpanded={() => setIsNavigationSheetExpanded((expanded) => !expanded)}
        onProfileChange={setProfile}
        onStartJourney={handleStartJourney}
        onStopNavigation={handleStopNavigation}
      />
    </main>
  );
}
