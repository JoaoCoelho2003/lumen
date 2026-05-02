"use client";

import {
  Car,
  CircleDot,
  Footprints,
  Loader2,
  Navigation,
  Route as RouteIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { formatDistance, formatDuration } from "@/lib/mapbox";
import type {
  Coordinates,
  GeocodingResult,
  NavigationState,
  Route,
  RankedRoute,
  RouteWeights,
  TravelProfile,
} from "@/lib/types";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchBar } from "@/components/ui/SearchBar";
import { ActionButtons } from "@/components/ui/action-buttons";

const MID_SNAP = 0.35;
const DEFAULT_OPEN_SNAP = 1;

type DrawerSnapPoint = number | string;

function getViewportSnapPoint(): DrawerSnapPoint {
  if (typeof window === "undefined") {
    return DEFAULT_OPEN_SNAP;
  }

  return `${window.innerHeight}px`;
}

type MapBottomDrawerProps = {
  state: NavigationState;
  route: Route | null;
  rankedRoutes: RankedRoute[];
  selectedRouteIndex: number | null;
  destinationName: string;
  destinationLabel: string;
  searchProximity: Coordinates | null;
  profile: TravelProfile;
  isLoadingRoute: boolean;
  error: string | null;
  weights: RouteWeights;
  isWeightsLoading: boolean;
  isWeightsSaving: boolean;
  weightsError: string | null;
  hasPendingWeightChanges: boolean;
  distanceRemaining: number;
  durationRemaining: number;
  activeStepIndex: number;
  onDestinationLabelChange: (value: string) => void;
  onDestinationSelect: (result: GeocodingResult) => void;
  onDestinationCoordinatesChange: (coordinates: Coordinates | null) => void;
  onProfileChange: (profile: TravelProfile) => void;
  onSelectRoute: (index: number) => void;
  onLightWeightChange: (value: number) => void;
  onCrimeWeightChange: (value: number) => void;
  onSaveWeights: () => Promise<void>;
  onStartJourney: () => void;
  onStopNavigation: () => void;
  onSafetyRoute: () => void;
  isSafetyRouteLoading: boolean;
  safeSpotsEnabled: boolean;
  onSafeSpotsEnabledChange: (enabled: boolean) => void;
};

function ManeuverIcon({ type }: { type: string }) {
  if (type === "arrive") {
    return <CircleDot className="h-4 w-4" />;
  }

  return <Navigation className="h-4 w-4" />;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

type SettingsPanelProps = {
  weights: RouteWeights;
  isWeightsLoading: boolean;
  isWeightsSaving: boolean;
  weightsError: string | null;
  hasPendingWeightChanges: boolean;
  safeSpotsEnabled: boolean;
  onSafeSpotsEnabledChange: (enabled: boolean) => void;
  onLightWeightChange: (value: number) => void;
  onCrimeWeightChange: (value: number) => void;
  onSaveWeights: () => Promise<void>;
};

function SettingsPanel({
  weights,
  isWeightsLoading,
  isWeightsSaving,
  weightsError,
  hasPendingWeightChanges,
  safeSpotsEnabled,
  onSafeSpotsEnabledChange,
  onLightWeightChange,
  onCrimeWeightChange,
  onSaveWeights,
}: SettingsPanelProps) {
  return (
    <div className="space-y-4 px-1 py-1 text-sm text-muted-foreground">
      {isWeightsLoading ? (
        <div className="rounded-xl border border-border/60 bg-background/40 px-3 py-3 text-xs">
          Loading saved weights...
        </div>
      ) : null}

      {weightsError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-3 text-xs text-destructive">
          {weightsError}
        </div>
      ) : null}

      <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Safe spots</p>
            <p className="text-xs text-muted-foreground">
              Show nearby police, hospitals, and firefighters
            </p>
          </div>
          <Switch
            checked={safeSpotsEnabled}
            onCheckedChange={onSafeSpotsEnabledChange}
            aria-label="Toggle safe spots"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Light weight</p>
            <p className="text-xs text-muted-foreground">
              Influence for low-light segments
            </p>
          </div>
          <span className="text-xs font-semibold text-foreground">
            {Math.round(weights.light_weight * 100)}
          </span>
        </div>
        <div className="mt-3">
          <Slider
            value={[weights.light_weight * 100]}
            min={0}
            max={100}
            onValueChange={([value]) => onLightWeightChange(value / 100)}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Crime weight</p>
            <p className="text-xs text-muted-foreground">
              Influence for crime-related segments
            </p>
          </div>
          <span className="text-xs font-semibold text-foreground">
            {Math.round(weights.crime_weight * 100)}
          </span>
        </div>
        <div className="mt-3">
          <Slider
            value={[weights.crime_weight * 100]}
            min={0}
            max={100}
            onValueChange={([value]) => onCrimeWeightChange(value / 100)}
          />
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onSaveWeights}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all duration-300 ease-out hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          disabled={!hasPendingWeightChanges || isWeightsSaving}
        >
          {isWeightsSaving ? "Saving..." : "Save weights"}
        </button>
      </div>
    </div>
  );
}

type RoutePanelProps = {
  route: Route | null;
  rankedRoutes: RankedRoute[];
  selectedRouteIndex: number | null;
  onSelectRoute: (index: number) => void;
};

function RoutePanel({
  route,
  rankedRoutes,
  selectedRouteIndex,
  onSelectRoute,
}: RoutePanelProps) {
  const selectedCandidate =
    rankedRoutes.find(
      (candidate, index) =>
        (candidate.source_route_index ?? index) === selectedRouteIndex,
    ) ?? rankedRoutes[0];

  return (
    <div className="space-y-4 px-1 py-1">
      {route ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-3">
            <p className="text-xs text-muted-foreground">Distance</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {formatDistance(route.distance)}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-3">
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {formatDuration(route.duration)}
            </p>
          </div>
        </div>
      ) : null}

      {selectedCandidate ? (
        <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Selected safety score
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ranked against available Mapbox alternatives
              </p>
            </div>
            <span className="text-lg font-semibold text-primary">
              {Math.round(selectedCandidate.score_percent)}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Lighting</p>
              <p className="font-semibold text-foreground">
                {formatPercent(selectedCandidate.coverage)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Crime reports</p>
              <p className="font-semibold text-foreground">
                {selectedCandidate.crime_points_near_route}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Dark stretch</p>
              <p className="font-semibold text-foreground">
                {formatPercent(selectedCandidate.longest_dark_run_ratio)}
              </p>
            </div>
          </div>
          {selectedCandidate.notes[0] ? (
            <p className="mt-3 rounded-md bg-background/50 px-2 py-2 text-xs text-muted-foreground">
              {selectedCandidate.notes[0]}
            </p>
          ) : null}
        </div>
      ) : null}

      {rankedRoutes.length > 1 ? (
        <div className="space-y-2">
          <p className="px-1 text-xs font-semibold uppercase text-muted-foreground">
            Alternatives
          </p>
          {rankedRoutes.slice(0, 5).map((candidate, index) => {
            const sourceIndex = candidate.source_route_index ?? index;
            const isSelected = selectedRouteIndex === sourceIndex;

            return (
              <button
                type="button"
                key={`${sourceIndex}-${candidate.score}`}
                onClick={() => onSelectRoute(sourceIndex)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left transition-all duration-300 ease-out ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border/60 bg-background/40 hover:bg-muted/40"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Route {index + 1}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {candidate.distance_km.toFixed(1)} km ·{" "}
                    {formatPercent(candidate.coverage)} lighting ·{" "}
                    {candidate.crime_points_near_route} reports
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-primary">
                  {Math.round(candidate.score_percent)}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

    </div>
  );
}

type DirectionsPanelProps = {
  route: Route | null;
  activeStepIndex: number;
};

function DirectionsPanel({ route, activeStepIndex }: DirectionsPanelProps) {
  const remainingSteps = route?.steps.slice(activeStepIndex) ?? [];

  return (
    <div className="space-y-1 px-1 py-1">
      {remainingSteps.length > 0 ? (
        remainingSteps.map((step, index) => (
          <div
            key={`${step.instruction}-${index}`}
            className="flex items-start gap-3 border-b border-border/40 py-3 last:border-0"
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/60 text-primary">
              <ManeuverIcon type={step.maneuver.type} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {step.instruction}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistance(step.distance)} · {formatDuration(step.duration)}
              </p>
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-6 text-sm text-muted-foreground">
          Directions will appear after a route is calculated.
        </div>
      )}
    </div>
  );
}

export function MapBottomDrawer({
  state,
  route,
  rankedRoutes,
  selectedRouteIndex,
  destinationName,
  destinationLabel,
  searchProximity,
  profile,
  isLoadingRoute,
  error,
  weights,
  isWeightsLoading,
  isWeightsSaving,
  weightsError,
  hasPendingWeightChanges,
  distanceRemaining,
  durationRemaining,
  activeStepIndex,
  onDestinationLabelChange,
  onDestinationSelect,
  onDestinationCoordinatesChange,
  onProfileChange,
  onSelectRoute,
  onLightWeightChange,
  onCrimeWeightChange,
  onSaveWeights,
  onStartJourney,
  onStopNavigation,
  onSafetyRoute,
  isSafetyRouteLoading,
  safeSpotsEnabled,
  onSafeSpotsEnabledChange,
}: MapBottomDrawerProps) {
  const showSearch = state !== "navigating";
  const [openSnapPoint, setOpenSnapPoint] =
    useState<DrawerSnapPoint>(DEFAULT_OPEN_SNAP);
  const [drawerState, setDrawerState] = useState<{
    mode: NavigationState;
    snapPoint: DrawerSnapPoint;
  }>({
    mode: state,
    snapPoint: state === "preview" ? DEFAULT_OPEN_SNAP : MID_SNAP,
  });

  useEffect(() => {
    function syncOpenSnapPoint() {
      setOpenSnapPoint(getViewportSnapPoint());
    }

    window.addEventListener("resize", syncOpenSnapPoint);
    window.visualViewport?.addEventListener("resize", syncOpenSnapPoint);

    return () => {
      window.removeEventListener("resize", syncOpenSnapPoint);
      window.visualViewport?.removeEventListener("resize", syncOpenSnapPoint);
    };
  }, []);

  const activeSnapPoint =
    drawerState.mode === state
      ? drawerState.snapPoint
      : state === "preview"
        ? openSnapPoint
        : MID_SNAP;

  const remainingSteps = route?.steps.slice(activeStepIndex) ?? [];
  const snapPoints = [MID_SNAP, openSnapPoint];
  const activeSnapPointIsAvailable = snapPoints.includes(activeSnapPoint);
  const resolvedActiveSnapPoint = activeSnapPointIsAvailable
    ? activeSnapPoint
    : openSnapPoint;
  function handleSearchFocus() {
    const nextOpenSnapPoint = getViewportSnapPoint();
    setOpenSnapPoint(nextOpenSnapPoint);
    setDrawerState({ mode: state, snapPoint: nextOpenSnapPoint });
  }

  function handleDestinationSelect(result: GeocodingResult) {
    onDestinationSelect(result);
    const nextOpenSnapPoint = getViewportSnapPoint();
    setOpenSnapPoint(nextOpenSnapPoint);
    setDrawerState({ mode: state, snapPoint: nextOpenSnapPoint });
  }

  return (
    <Drawer
      open
      autoFocus={false}
      modal={false}
      dismissible={false}
      repositionInputs={false}
      snapPoints={snapPoints}
      activeSnapPoint={resolvedActiveSnapPoint}
      setActiveSnapPoint={(snapPoint) => {
        if (snapPoint !== null && snapPoints.includes(snapPoint)) {
          setDrawerState({
            mode: state,
            snapPoint: snapPoint as DrawerSnapPoint,
          });
        }
      }}
    >
      <DrawerContent
        showOverlay={false}
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="z-40 mx-auto h-[100dvh] max-h-[100dvh] max-w-3xl rounded-t-2xl border-x border-t border-border/60 bg-card/95 p-0 text-foreground shadow-2xl outline-none backdrop-blur-md before:hidden focus:outline-none focus-visible:outline-none sm:inset-x-4 sm:bottom-4 sm:h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl sm:border"
      >
        <DrawerTitle className="sr-only">Route controls</DrawerTitle>
        <DrawerDescription className="sr-only">
          Search for a destination, preview the route, and manage active
          navigation.
        </DrawerDescription>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-3 sm:px-4">
          {showSearch && (
            <div
              className={
                state === "preview"
                  ? "flex flex-col gap-6"
                  : "flex min-h-0 flex-1 flex-col gap-6"
              }
            >
              <SearchBar
                destinationLabel={destinationLabel}
                error={state === "idle" ? error : null}
                proximity={searchProximity}
                suggestionsPlacement="below"
                onFocus={handleSearchFocus}
                onDestinationLabelChange={onDestinationLabelChange}
                onDestinationSelect={handleDestinationSelect}
                onDestinationCoordinatesChange={onDestinationCoordinatesChange}
              />

              {state !== "preview" && (
                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <SettingsPanel
                    weights={weights}
                    isWeightsLoading={isWeightsLoading}
                    isWeightsSaving={isWeightsSaving}
                    weightsError={weightsError}
                    hasPendingWeightChanges={hasPendingWeightChanges}
                    safeSpotsEnabled={safeSpotsEnabled}
                    onSafeSpotsEnabledChange={onSafeSpotsEnabledChange}
                    onLightWeightChange={onLightWeightChange}
                    onCrimeWeightChange={onCrimeWeightChange}
                    onSaveWeights={onSaveWeights}
                  />
                </div>
              )}

              <ActionButtons
                visible={state !== "preview"}
                onSafetyRoute={onSafetyRoute}
                isSafetyRouteLoading={isSafetyRouteLoading}
              />
            </div>
          )}

          {state === "navigating" && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 items-center justify-between gap-3 px-1 py-2 text-left">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Remaining
                  </p>
                  <p className="truncate text-base font-semibold">
                    {formatDuration(durationRemaining)} ·{" "}
                    {formatDistance(distanceRemaining)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onStopNavigation}
                  className="rounded-xl bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground transition-all duration-300 ease-out hover:bg-destructive/90"
                >
                  Stop
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto border-t border-border/60 px-1 py-2">
                {remainingSteps.map((step, index) => (
                  <div
                    key={`${step.instruction}-${index}`}
                    className="flex items-start gap-3 border-b border-border/40 py-3 last:border-0"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/60 text-primary">
                      <ManeuverIcon type={step.maneuver.type} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {step.instruction}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistance(step.distance)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {state === "preview" && (
            <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-muted/20">
              <div className="shrink-0 border-b border-border/60 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">
                      {destinationName || "Selected destination"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {route
                        ? `${formatDistance(route.distance)} · ${formatDuration(route.duration)}`
                        : "Set origin and destination to calculate a route"}
                    </p>
                  </div>
                  {isLoadingRoute && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 rounded-xl bg-muted/30 p-1">
                  <button
                    type="button"
                    onClick={() => onProfileChange("driving")}
                    className={`flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-300 ease-out ${
                      profile === "driving"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <Car className="h-4 w-4" />
                    Drive
                  </button>
                  <button
                    type="button"
                    onClick={() => onProfileChange("walking")}
                    className={`flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-300 ease-out ${
                      profile === "walking"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <Footprints className="h-4 w-4" />
                    Walk
                  </button>
                </div>

                {error && (
                  <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/15 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-hidden px-4 py-3">
                <Tabs
                  defaultValue="route"
                  className="flex h-full min-h-0 flex-col"
                >
                  <TabsList variant="line" className="w-full shrink-0">
                    <TabsTrigger value="route">Route</TabsTrigger>
                    <TabsTrigger value="directions">Directions</TabsTrigger>
                  </TabsList>
                  <TabsContent
                    value="route"
                    className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1"
                  >
                    <RoutePanel
                      route={route}
                      rankedRoutes={rankedRoutes}
                      selectedRouteIndex={selectedRouteIndex}
                      onSelectRoute={onSelectRoute}
                    />
                  </TabsContent>
                  <TabsContent
                    value="directions"
                    className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1"
                  >
                    <DirectionsPanel
                      route={route}
                      activeStepIndex={activeStepIndex}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              <div className="shrink-0 border-t border-border/60 p-4">
                <button
                  type="button"
                  disabled={!route || isLoadingRoute}
                  onClick={onStartJourney}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all duration-300 ease-out hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                >
                  <RouteIcon className="h-5 w-5" />
                  Start Trip
                </button>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
