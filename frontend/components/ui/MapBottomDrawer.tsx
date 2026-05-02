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
  TravelProfile,
} from "@/lib/types";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Slider } from "@/components/ui/slider";
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
  destinationName: string;
  destinationLabel: string;
  profile: TravelProfile;
  isLoadingRoute: boolean;
  error: string | null;
  distanceRemaining: number;
  durationRemaining: number;
  activeStepIndex: number;
  onDestinationLabelChange: (value: string) => void;
  onDestinationSelect: (result: GeocodingResult) => void;
  onDestinationCoordinatesChange: (coordinates: Coordinates | null) => void;
  onProfileChange: (profile: TravelProfile) => void;
  onStartJourney: () => void;
  onStopNavigation: () => void;
  onSafetyRoute: () => void;
  isSafetyRouteLoading: boolean;
};

function ManeuverIcon({ type }: { type: string }) {
  if (type === "arrive") {
    return <CircleDot className="h-4 w-4" />;
  }

  return <Navigation className="h-4 w-4" />;
}

export function MapBottomDrawer({
  state,
  route,
  destinationName,
  destinationLabel,
  profile,
  isLoadingRoute,
  error,
  distanceRemaining,
  durationRemaining,
  activeStepIndex,
  onDestinationLabelChange,
  onDestinationSelect,
  onDestinationCoordinatesChange,
  onProfileChange,
  onStartJourney,
  onStopNavigation,
  onSafetyRoute,
  isSafetyRouteLoading,
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
  const [pinWeights, setPinWeights] = useState({
    lowLight: 50,
    dangerousArea: 50,
  });
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

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

  function updatePinWeight(key: "lowLight" | "dangerousArea", value: number) {
    setPinWeights((current) => ({ ...current, [key]: value }));
    setHasPendingChanges(true);
    // TODO: connect to tanstack mutation for API persistence.
  }

  function handleSavePinWeights() {
    // TODO: connect to tanstack mutation for API persistence.
    setHasPendingChanges(false);
  }

  return (
    <Drawer
      open
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
        className="z-40 mx-auto h-[100dvh] max-h-[100dvh] max-w-3xl rounded-t-2xl border-x border-t border-border/60 bg-card/95 p-0 text-foreground shadow-2xl backdrop-blur-md before:hidden sm:inset-x-4 sm:bottom-4 sm:h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl sm:border"
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
                suggestionsPlacement="below"
                onFocus={handleSearchFocus}
                onDestinationLabelChange={onDestinationLabelChange}
                onDestinationSelect={handleDestinationSelect}
                onDestinationCoordinatesChange={onDestinationCoordinatesChange}
              />

              {state !== "preview" && (
                <Tabs defaultValue="overview" className="w-full min-h-0 flex-1">
                  <TabsList variant="line" className="w-full">
                    <TabsTrigger value="overview">Statistics</TabsTrigger>
                    <TabsTrigger value="reports">Settings</TabsTrigger>
                  </TabsList>
                  <TabsContent
                    value="overview"
                    className="mt-4 max-h-[42vh] overflow-y-auto pr-1"
                  >
                    <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                      Hello World
                    </div>
                  </TabsContent>
                  <TabsContent
                    value="reports"
                    className="mt-4 max-h-[42vh] overflow-y-auto pr-1"
                  >
                    <div className="px-4 py-6 text-sm text-muted-foreground">
                      <div className="space-y-4">
                        <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">
                                Low light weight
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Influence for low-light segments
                              </p>
                            </div>
                            <span className="text-xs font-semibold text-foreground">
                              {pinWeights.lowLight}
                            </span>
                          </div>
                          <div className="mt-3">
                            <Slider
                              value={[pinWeights.lowLight]}
                              min={0}
                              max={100}
                              onValueChange={([value]) =>
                                updatePinWeight("lowLight", value)
                              }
                            />
                          </div>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">
                                Dangerous area weight
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Influence for dangerous areas
                              </p>
                            </div>
                            <span className="text-xs font-semibold text-foreground">
                              {pinWeights.dangerousArea}
                            </span>
                          </div>
                          <div className="mt-3">
                            <Slider
                              value={[pinWeights.dangerousArea]}
                              min={0}
                              max={100}
                              onValueChange={([value]) =>
                                updatePinWeight("dangerousArea", value)
                              }
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={handleSavePinWeights}
                            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all duration-300 ease-out hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                            disabled={!hasPendingChanges}
                          >
                            Save weights
                          </button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
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

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
                {route?.steps.map((step, index) => (
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
                        {formatDistance(step.distance)} ·{" "}
                        {formatDuration(step.duration)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="shrink-0 border-t border-border/60 p-4">
                <button
                  type="button"
                  disabled={!route || isLoadingRoute}
                  onClick={onStartJourney}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all duration-300 ease-out hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                >
                  <RouteIcon className="h-5 w-5" />
                  Start Journey
                </button>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
