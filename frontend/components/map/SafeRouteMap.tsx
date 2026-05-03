"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";

import { Crosshair, LightbulbOff, Loader2, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Map, { type MapRef } from "react-map-gl";
import { useSession } from "next-auth/react";
import { useDirections } from "@/hooks/useDirections";
import { useCrowdPresence } from "@/hooks/useCrowdPresence";
import { useNavigation } from "@/hooks/useNavigation";
import { useCreatePin, useGetPins } from "@/app/api/queries/pins";

import {
  DAY_STYLE_START_HOUR,
  DEFAULT_VIEW_STATE,
  MAP_STYLES,
  MAPBOX_TOKEN,
  NIGHT_STYLE_START_HOUR,
  PORTUGAL_BOUNDS,
  PORTUGAL_TIME_ZONE,
} from "../../lib/constants";

import {
  calculateBearing,
  calculateDistance,
  getBoundsFromCoordinates,
} from "../../lib/mapbox";
import type {
  Coordinates,
  GeocodingResult,
  NavigationState,
  PinType,
  TravelProfile,
} from "../../lib/types";
import type { PinTag } from "@/components/ui/PinTags";
import { CrimeLayer } from "../../components/map/CrimeLayer";
import { HeatmapLayer } from "../../components/map/HeatmapLayer";
import { MarkerLayer } from "../../components/map/MarkerLayer";
import { PinLayer } from "@/components/map/PinLayer";
import { RouteLayer } from "@/components/map/RouteLayer";
import { LayerToggles } from "@/components/ui/LayerToggles";
import { MapBottomDrawer } from "@/components/ui/MapBottomDrawer";
import { PinTags } from "@/components/ui/PinTags";
import { RightSideDrawer } from "@/components/ui/RightSideDrawer";
import { useSafeSpots } from "@/app/api/queries/safe-spots";
import { UserMenu } from "@/components/ui/UserMenu";
import { useRouteWeights } from "@/hooks/useRouteWeights";

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

const SAFE_SPOT_MARKER_MIN_ZOOM = 13;
const PIN_MARKER_MIN_ZOOM = 13;
const FAST_LOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 3_000,
  maximumAge: 60_000,
};
const PRECISE_LOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 5_000,
};

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
  const [pinFeedback, setPinFeedback] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);
  const [pinDrawerOpen, setPinDrawerOpen] = useState(false);

  const { data: session, status: sessionStatus } = useSession();
  const userId = session?.user?.name ?? undefined;
  const pins = useGetPins();
  const addPin = useCreatePin();
  const [mapZoom, setMapZoom] = useState(DEFAULT_VIEW_STATE.zoom);
  const [safeSpotsEnabled, setSafeSpotsEnabled] = useState(true);
  const [selectedSafeSpotId, setSelectedSafeSpotId] = useState<string | null>(
    null,
  );
  const [shouldStartSafeRoute, setShouldStartSafeRoute] = useState(false);
  const [shouldAutoStartRoute, setShouldAutoStartRoute] = useState(false);
  const lastSafeSpotOriginRef = useRef<Coordinates | null>(null);
  const lastLocationAccuracyRef = useRef(Number.POSITIVE_INFINITY);

  const {
    draftWeights,
    isLoading: isWeightsLoading,
    isSaving: isWeightsSaving,
    error: weightsError,
    hasPendingChanges: hasPendingWeightChanges,
    setLightWeight,
    setCrimeWeight,
    saveWeights,
  } = useRouteWeights();

  const {
    route,
    rankedRoutes,
    selectedRouteIndex,
    isLoading,
    error,
    selectRouteByIndex,
  } = useDirections(origin, destination, profile, draftWeights);
  const { safeSpots, isLoadingSafeSpots, safeSpotsError, findSafeSpots } =
    useSafeSpots();
  const activeRoute = origin && destination && route ? route : null;
  const navigation = useNavigation(activeRoute, profile);
  const crowdPresenceCoordinates = navigation.position?.coordinates ?? origin;
  const {
    crowdPresenceEnabled,
    setCrowdPresenceEnabled,
    isSharingCrowdPresence,
  } = useCrowdPresence(crowdPresenceCoordinates);
  const metricsOptions = {
    performanceMetricsCollection: false,
  };
  const mapStyle = satelliteEnabled
    ? MAP_STYLES.satellite
    : getTimeBasedMapStyle(portugalHour);
  const isDaytime =
    portugalHour >= DAY_STYLE_START_HOUR && portugalHour < NIGHT_STYLE_START_HOUR;
  
  const durationRemaining = activeRoute
    ? (navigation.distanceRemaining / Math.max(activeRoute.distance, 1)) *
      activeRoute.duration
    : 0;
  const routeError = navigation.error ?? error ?? safeSpotsError;
  const showSafeSpotMarkers =
    safeSpotsEnabled &&
    (mapZoom >= SAFE_SPOT_MARKER_MIN_ZOOM || Boolean(selectedSafeSpotId));
  const showPinMarkers = mapZoom >= PIN_MARKER_MIN_ZOOM;

  useEffect(() => {
    if (activeRoute && sheetState !== "navigating" && !shouldStartSafeRoute) {
      const previewTransition = window.setTimeout(() => {
        setSheetState("preview");
      }, 0);

      return () => window.clearTimeout(previewTransition);
    }

    return undefined;
  }, [activeRoute, sheetState, shouldStartSafeRoute]);

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

  useEffect(() => {
    if (!origin) {
      return;
    }

    const lastSafeSpotOrigin = lastSafeSpotOriginRef.current;

    if (
      lastSafeSpotOrigin &&
      calculateDistance(lastSafeSpotOrigin, origin) < 50
    ) {
      return;
    }

    lastSafeSpotOriginRef.current = origin;
    void findSafeSpots(origin).catch(() => undefined);
  }, [findSafeSpots, origin]);

  function handleDestinationSelect(result: GeocodingResult) {
    setDestination(result.center);
    setDestinationLabel(result.place_name);
    setSelectedSafeSpotId(null);
    setShouldStartSafeRoute(false);
    setShouldAutoStartRoute(false);
  }

  const handleDestinationLabelChange = useCallback((value: string) => {
    setDestinationLabel(value);

    if (!value) {
      setDestination(null);
      setSheetState("idle");
      setSelectedSafeSpotId(null);
      setShouldStartSafeRoute(false);
    }
  }, []);

  const handleDestinationCoordinatesChange = useCallback(
    (coordinates: Coordinates | null) => {
      setDestination(coordinates);
      setSelectedSafeSpotId(null);
      setShouldStartSafeRoute(false);
      setShouldAutoStartRoute(false);

      if (!coordinates) {
        setSheetState("idle");
      }
    },
    [],
  );

  const handleStartJourney = useCallback(() => {
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
  }, [activeRoute, navigation, origin]);

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

  const applyLocation = useCallback(
    (location: GeolocationPosition, force = false) => {
      const coordinates: Coordinates = [
        location.coords.longitude,
        location.coords.latitude,
      ];
      const accuracy = location.coords.accuracy;

      if (!force && accuracy > lastLocationAccuracyRef.current + 10) {
        return coordinates;
      }

      lastLocationAccuracyRef.current = accuracy;
      handleUseMyLocation(coordinates);

      return coordinates;
    },
    [handleUseMyLocation],
  );

  const refineCurrentLocation = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (location) => {
        applyLocation(location);
      },
      () => undefined,
      PRECISE_LOCATION_OPTIONS,
    );
  }, [applyLocation]);

  const requestCurrentLocation = useCallback(() => {
    setLocationError(null);

    if (!navigator.geolocation) {
      const message = "Your browser does not support location access.";
      setLocationError(message);
      return Promise.reject(new Error(message));
    }

    if (!window.isSecureContext) {
      const message =
        "GPS requires HTTPS on mobile browsers. Use HTTPS or test on localhost.";
      setLocationError(message);
      return Promise.reject(new Error(message));
    }

    setIsLocating(true);
    return new Promise<Coordinates>((resolve, reject) => {
      let settled = false;
      const resolveWithLocation = (location: GeolocationPosition) => {
        const coordinates = applyLocation(location, true);

        if (!settled) {
          settled = true;
          setIsLocating(false);
          resolve(coordinates);
        }

        refineCurrentLocation();
      };
      const rejectWithMessage = () => {
        const message =
          "Could not get your location. Check browser permissions.";

        if (!settled) {
          settled = true;
          setLocationError(message);
          setIsLocating(false);
          reject(new Error(message));
        }
      };

      navigator.geolocation.getCurrentPosition(
        resolveWithLocation,
        () => {
          navigator.geolocation.getCurrentPosition(
            resolveWithLocation,
            rejectWithMessage,
            PRECISE_LOCATION_OPTIONS,
          );
        },
        FAST_LOCATION_OPTIONS,
      );
    });
  }, [applyLocation, refineCurrentLocation]);

  const requestMyLocation = useCallback(() => {
    void requestCurrentLocation().catch(() => undefined);
  }, [requestCurrentLocation]);

  const handleSafetyRoute = useCallback(async () => {
    try {
      setLocationError(null);
      setShouldStartSafeRoute(false);
      setProfile("walking");
      void navigation.prepareCompassTracking();
      const currentOrigin = origin ?? (await requestCurrentLocation());
      const nearbySafeSpots = await findSafeSpots(currentOrigin);
      const closestSafeSpot = nearbySafeSpots[0];

      if (!closestSafeSpot) {
        setLocationError("No nearby safe spots were found.");
        return;
      }

      setOrigin(currentOrigin);
      setSelectedSafeSpotId(closestSafeSpot.id);
      setDestination(closestSafeSpot.coordinates);
      setDestinationLabel(`Safety Route: ${closestSafeSpot.name}`);
      setSheetState("preview");
      setShouldStartSafeRoute(true);
    } catch (safeRouteError) {
      setShouldStartSafeRoute(false);
      setLocationError(
        safeRouteError instanceof Error
          ? safeRouteError.message
          : "Could not start a safety route.",
      );
    }
  }, [findSafeSpots, navigation, origin, requestCurrentLocation]);

  useEffect(() => {
    if (!shouldStartSafeRoute || isLoading || !activeRoute || routeError) {
      return;
    }

    const startSafetyRoute = window.setTimeout(() => {
      handleStartJourney();
      setShouldStartSafeRoute(false);
    }, 0);

    return () => window.clearTimeout(startSafetyRoute);
  }, [
    activeRoute,
    handleStartJourney,
    isLoading,
    routeError,
    shouldStartSafeRoute,
  ]);

  useEffect(() => {
    if (
      !shouldAutoStartRoute ||
      shouldStartSafeRoute ||
      isLoading ||
      !activeRoute ||
      routeError
    ) {
      return;
    }

    const autoStartRoute = window.setTimeout(() => {
      handleStartJourney();
      setShouldAutoStartRoute(false);
    }, 0);

    return () => window.clearTimeout(autoStartRoute);
  }, [
    activeRoute,
    handleStartJourney,
    isLoading,
    routeError,
    shouldAutoStartRoute,
    shouldStartSafeRoute,
  ]);

  useEffect(() => {
    if (shouldStartSafeRoute && routeError) {
      const resetSafetyRoute = window.setTimeout(() => {
        setShouldStartSafeRoute(false);
      }, 0);

      return () => window.clearTimeout(resetSafetyRoute);
    }

    return undefined;
  }, [routeError, shouldStartSafeRoute]);

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

  async function handlePinConfirm(tag: PinTag) {
    if (sessionStatus !== "authenticated" || !userId) {
      setPinFeedback({ ok: false, msg: "Log in to submit pins." });
      window.setTimeout(() => setPinFeedback(null), 3000);
      return;
    }

    const coords: Coordinates = origin ??
      (mapRef.current
        ? [mapRef.current.getCenter().lng, mapRef.current.getCenter().lat]
        : null) ?? [0, 0];

    const ok = await addPin(coords, tag.value as PinType, userId);
    setPinDrawerOpen(false);
    setPinFeedback(
      ok
        ? { ok: true, msg: "Pin submitted!" }
        : { ok: false, msg: "Failed to save pin." },
    );
    window.setTimeout(() => setPinFeedback(null), 3000);
  }

  function handleStopNavigation() {
    const currentCoordinates = navigation.position?.coordinates ?? origin;

    navigation.stopNavigation();
    setSheetState("idle");
    setDestination(null);
    setDestinationLabel("");
    setSelectedSafeSpotId(null);
    setShouldStartSafeRoute(false);

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
      {locationError && (
        <div className="pointer-events-none p-3 fixed inset-x-4 top-4 z-40 rounded-xl border border-destructive/40 bg-destructive/15 text-xs text-destructive shadow-2xl backdrop-blur-md">
          {locationError}
        </div>
      )}

      <div className="fixed right-3 top-3 z-10">
        <UserMenu />
      </div>

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
        onZoom={(event) => {
          setMapZoom(event.viewState.zoom);
        }}
      >
        <CrimeLayer enabled={heatmapEnabled} hour={portugalHour} />
        <HeatmapLayer enabled={lightingEnabled} />
        <RouteLayer
          route={activeRoute}
          distanceTravelled={navigation.distanceTravelled}
        />
        <PinLayer pins={pins} visible={showPinMarkers} />
        <MarkerLayer
          origin={origin}
          destination={destination}
          position={navigation.position}
          safeSpots={safeSpots}
          selectedSafeSpotId={selectedSafeSpotId}
          showSafeSpots={showSafeSpotMarkers}
          zoom={mapZoom}
        />
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
        open={pinDrawerOpen}
        onOpenChange={setPinDrawerOpen}
        inlineStatus={
          pinFeedback ? (
            <div
              className={`pointer-events-none w-[calc(100vw-5.5rem)] max-w-sm rounded-xl border px-3 py-2 text-xs shadow-2xl backdrop-blur-md transition-all duration-300 ease-out ${
                pinFeedback.ok
                  ? "border-success/40 bg-success/15 text-success"
                  : "border-destructive/40 bg-destructive/15 text-destructive"
              }`}
            >
              {pinFeedback.msg}
            </div>
          ) : null
        }
      >
        <PinTags tags={pinTags} onConfirm={handlePinConfirm} />
      </RightSideDrawer>

      <MapBottomDrawer
        state={sheetState}
        route={activeRoute}
        rankedRoutes={rankedRoutes}
        selectedRouteIndex={selectedRouteIndex}
        destinationName={destinationLabel}
        destinationLabel={destinationLabel}
        searchProximity={origin}
        profile={profile}
        isLoadingRoute={isLoading}
        error={routeError}
        weights={draftWeights}
        isWeightsLoading={isWeightsLoading}
        isWeightsSaving={isWeightsSaving}
        weightsError={weightsError}
        hasPendingWeightChanges={hasPendingWeightChanges}
        crowdPresenceEnabled={crowdPresenceEnabled}
        isSharingCrowdPresence={isSharingCrowdPresence}
        isDaytime={isDaytime}
        distanceRemaining={navigation.distanceRemaining}
        durationRemaining={durationRemaining}
        activeStepIndex={navigation.stepIndex}
        onDestinationLabelChange={handleDestinationLabelChange}
        onDestinationSelect={handleDestinationSelect}
        onDestinationCoordinatesChange={handleDestinationCoordinatesChange}
        onProfileChange={setProfile}
        onSelectRoute={selectRouteByIndex}
        onLightWeightChange={setLightWeight}
        onCrimeWeightChange={setCrimeWeight}
        onSaveWeights={saveWeights}
        onCrowdPresenceEnabledChange={setCrowdPresenceEnabled}
        onStartJourney={handleStartJourney}
        onStopNavigation={handleStopNavigation}
        onSafetyRoute={handleSafetyRoute}
        isSafetyRouteLoading={isLoadingSafeSpots || isLocating}
        safeSpotsEnabled={safeSpotsEnabled}
        onSafeSpotsEnabledChange={setSafeSpotsEnabled}
      />
    </main>
  );
}
