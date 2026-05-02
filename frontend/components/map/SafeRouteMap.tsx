"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";

import { Crosshair, LightbulbOff, Loader2, TriangleAlert } from "lucide-react";
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
import {
  calculateBearing,
  calculateDistance,
  getBoundsFromCoordinates,
} from "@/lib/mapbox";
import type {
  Coordinates,
  GeocodingResult,
  NavigationState,
  TravelProfile,
} from "@/lib/types";
import { CrimeLayer } from "@/components/map/CrimeLayer";
import { HeatmapLayer } from "@/components/map/HeatmapLayer";
import { MarkerLayer } from "@/components/map/MarkerLayer";
import { RouteLayer } from "@/components/map/RouteLayer";
import { LayerToggles } from "@/components/ui/LayerToggles";
import { MapBottomDrawer } from "@/components/ui/MapBottomDrawer";
import { NavigationBar } from "@/components/ui/NavigationBar";
import { PinTags } from "@/components/ui/PinTags";
import { RightSideDrawer } from "@/components/ui/RightSideDrawer";

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
  const [satelliteEnabled, setSatelliteEnabled] = useState(false);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [lightingEnabled, setLightingEnabled] = useState(false);
  const [portugalHour, setPortugalHour] = useState(getPortugalHour);
  const [isFocusedOnUser, setIsFocusedOnUser] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const { route, isLoading, error } = useDirections(
    origin,
    destination,
    profile,
  );
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

    return calculateDistance(
      navigation.position.coordinates,
      activeStep.maneuver.location,
    );
  }, [activeStep, navigation.position]);
  const durationRemaining = activeRoute
    ? (navigation.distanceRemaining / Math.max(activeRoute.distance, 1)) *
      activeRoute.duration
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
    if (
      !activeRoute ||
      activeRoute.geometry.coordinates.length === 0 ||
      !mapRef.current
    ) {
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

  const handleDestinationLabelChange = useCallback((value: string) => {
    setDestinationLabel(value);

    if (!value) {
      setDestination(null);
      setSheetState("idle");
    }
  }, []);

  const handleDestinationCoordinatesChange = useCallback(
    (coordinates: Coordinates | null) => {
      setDestination(coordinates);

      if (!coordinates) {
        setSheetState("idle");
      }
    },
    [],
  );

  function handleStartJourney() {
    if (!activeRoute || activeRoute.geometry.coordinates.length === 0) {
      return;
    }

    const startCoordinates = origin ?? activeRoute.geometry.coordinates[0];
    const startBearing =
      navigation.position?.bearing ??
      calculateBearing(
        activeRoute.geometry.coordinates[0],
        activeRoute.geometry.coordinates[1] ??
          activeRoute.geometry.coordinates[0],
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
      setLocationError(
        "GPS requires HTTPS on mobile browsers. Use HTTPS or test on localhost.",
      );
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (location) => {
        handleUseMyLocation([
          location.coords.longitude,
          location.coords.latitude,
        ]);
        setIsLocating(false);
      },
      () => {
        setLocationError(
          "Could not get your location. Check browser permissions.",
        );
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

  const pinTags = [
    {
      icon: TriangleAlert,
      name: "Dangerous Area",
      value: "dangerous-area",
      colorClass: "text-destructive",
      bgClass: "bg-destructive/15",
      ringClass: "ring-destructive/30",
    },
    {
      icon: LightbulbOff,
      name: "Low light",
      value: "low-light",
      colorClass: "text-amber-500",
      bgClass: "bg-amber-500/15",
      ringClass: "ring-amber-500/30",
    },
  ];

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-background text-foreground">
      {/* Navigation Top Bar */}
      {sheetState === "navigating" && (
        <NavigationBar
          step={activeStep}
          distanceToNextManeuver={distanceToNextManeuver}
        />
      )}

      {locationError && (
        <div className="pointer-events-none p-3 fixed inset-x-4 top-4 z-40 rounded-xl border border-destructive/40 bg-destructive/15 text-xs text-destructive shadow-2xl backdrop-blur-md">
          {locationError}
        </div>
      )}

      {/*Map*/}
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
        <CrimeLayer enabled={heatmapEnabled} hour={portugalHour} />
        <HeatmapLayer enabled={lightingEnabled} />
        <RouteLayer route={activeRoute} distanceTravelled={navigation.distanceTravelled} />
        <MarkerLayer origin={origin} destination={destination} position={navigation.position} />
      </Map>

      {/* side options */}

      <div className="flex flex-col gap-2 fixed z-10 left-3 top-1/4">
        <button
          type="button"
          onClick={recenterOnUser}
          className={`pointer-events-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-card/95 text-primary shadow-2xl backdrop-blur-md transition-all duration-300 ease-out hover:bg-muted/40 ${isFocusedOnUser ? "opacity-0" : "opacity-100"}`}
          aria-label="Recenter on my location"
          title="Recenter"
        >
          {isLocating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Crosshair className="h-5 w-5" />
          )}
        </button>

        <LayerToggles
          satelliteEnabled={satelliteEnabled}
          heatmapEnabled={heatmapEnabled}
          lightingEnabled={lightingEnabled}
          onSatelliteToggle={() => setSatelliteEnabled((enabled) => !enabled)}
          onHeatmapToggle={() => setHeatmapEnabled((enabled) => !enabled)}
          onLightingToggle={() => setLightingEnabled((enabled) => !enabled)}
        />
      </div>

      <RightSideDrawer
        title="Pin Allert"
        description="Alert about pins on the route. Tap to view details."
        triggerLabel="Open quick settings"
      >
        <PinTags tags={pinTags} />
      </RightSideDrawer>

      <MapBottomDrawer
        state={sheetState}
        route={activeRoute}
        destinationName={destinationLabel}
        destinationLabel={destinationLabel}
        profile={profile}
        isLoadingRoute={isLoading}
        error={routeError}
        distanceRemaining={navigation.distanceRemaining}
        durationRemaining={durationRemaining}
        activeStepIndex={navigation.stepIndex}
        onDestinationLabelChange={handleDestinationLabelChange}
        onDestinationSelect={handleDestinationSelect}
        onDestinationCoordinatesChange={handleDestinationCoordinatesChange}
        onProfileChange={setProfile}
        onStartJourney={handleStartJourney}
        onStopNavigation={handleStopNavigation}
      />
    </main>
  );
}
