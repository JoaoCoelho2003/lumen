"use client";

import {
  Car,
  CircleDot,
  Footprints,
  Loader2,
  Navigation,
  Route as RouteIcon,
} from "lucide-react";
import { useState } from "react";
import { formatDistance, formatDuration } from "@/lib/mapbox";
import type {
  Coordinates,
  GeocodingResult,
  NavigationState,
  Route,
  TravelProfile,
} from "@/lib/types";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { SearchBar } from "@/components/ui/SearchBar";

const CLOSED_SNAP = "104px";
const MID_SNAP = 0.35;
const OPEN_SNAP = 0.9;
const SEARCH_SNAP_POINTS = [MID_SNAP, OPEN_SNAP];
const NAVIGATION_SNAP_POINTS = [CLOSED_SNAP, MID_SNAP, OPEN_SNAP];

type DrawerSnapPoint = (typeof NAVIGATION_SNAP_POINTS)[number];

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
}: MapBottomDrawerProps) {
  const showSearch = state !== "navigating";
  const [drawerState, setDrawerState] = useState<{
    mode: NavigationState;
    snapPoint: DrawerSnapPoint;
  }>({
    mode: state,
    snapPoint: showSearch ? MID_SNAP : CLOSED_SNAP,
  });

  const activeSnapPoint =
    drawerState.mode === state
      ? drawerState.snapPoint
      : state === "preview"
        ? MID_SNAP
        : showSearch
          ? MID_SNAP
          : CLOSED_SNAP;

  const remainingSteps = route?.steps.slice(activeStepIndex) ?? [];
  const snapPoints = showSearch ? SEARCH_SNAP_POINTS : NAVIGATION_SNAP_POINTS;

  function handleSearchFocus() {
    setDrawerState({ mode: state, snapPoint: OPEN_SNAP });
  }

  function handleDestinationSelect(result: GeocodingResult) {
    onDestinationSelect(result);
    setDrawerState({ mode: state, snapPoint: MID_SNAP });
  }

  return (
    <Drawer
      open
      modal={false}
      dismissible={false}
      snapPoints={snapPoints}
      activeSnapPoint={activeSnapPoint}
      setActiveSnapPoint={(snapPoint) => {
        if (snapPoint !== null && snapPoints.includes(snapPoint as DrawerSnapPoint)) {
          setDrawerState({ mode: state, snapPoint: snapPoint as DrawerSnapPoint });
        }
      }}
    >
      <DrawerContent
        showOverlay={false}
        className="z-40 mx-auto h-[90dvh] max-h-[90dvh] max-w-3xl rounded-t-2xl border-x border-t border-white/10 bg-[#0f1117]/95 p-0 text-white shadow-2xl backdrop-blur-md before:hidden sm:inset-x-4 sm:bottom-4 sm:rounded-2xl sm:border"
      >
        <DrawerTitle className="sr-only">Route controls</DrawerTitle>
        <div className="mx-auto mt-3 h-1.5 w-24 shrink-0 rounded-full bg-white/20" />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-3 sm:px-4">
          {showSearch ? (
            <div className="shrink-0">
              <SearchBar
                destinationLabel={destinationLabel}
                error={state === "idle" ? error : null}
                suggestionsPlacement="below"
                onFocus={handleSearchFocus}
                onDestinationLabelChange={onDestinationLabelChange}
                onDestinationSelect={handleDestinationSelect}
                onDestinationCoordinatesChange={onDestinationCoordinatesChange}
              />
            </div>
          ) : null}

          {state === "navigating" ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 items-center justify-between gap-3 px-1 py-2 text-left">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Remaining</p>
                  <p className="truncate text-base font-semibold">
                    {formatDuration(durationRemaining)} · {formatDistance(distanceRemaining)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onStopNavigation}
                  className="rounded-xl bg-red-500 px-3 py-2 text-xs font-semibold text-white transition-all duration-300 ease-out hover:bg-red-600"
                >
                  Stop
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto border-t border-white/10 px-1 py-2">
                {remainingSteps.map((step, index) => (
                  <div
                    key={`${step.instruction}-${index}`}
                    className="flex items-start gap-3 border-b border-white/5 py-3 last:border-0"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-blue-300">
                      <ManeuverIcon type={step.maneuver.type} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{step.instruction}</p>
                      <p className="text-xs text-slate-400">{formatDistance(step.distance)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {state === "preview" ? (
            <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="shrink-0 border-b border-white/10 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">
                      {destinationName || "Selected destination"}
                    </p>
                    <p className="text-sm text-slate-400">
                      {route
                        ? `${formatDistance(route.distance)} · ${formatDuration(route.duration)}`
                        : "Set origin and destination to calculate a route"}
                    </p>
                  </div>
                  {isLoadingRoute ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-300" />
                  ) : null}
                </div>

                <div className="mt-4 grid grid-cols-2 rounded-xl bg-white/5 p-1">
                  <button
                    type="button"
                    onClick={() => onProfileChange("driving")}
                    className={`flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-300 ease-out ${
                      profile === "driving"
                        ? "bg-blue-500 text-white"
                        : "text-slate-400 hover:bg-white/10 hover:text-white"
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
                        ? "bg-blue-500 text-white"
                        : "text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Footprints className="h-4 w-4" />
                    Walk
                  </button>
                </div>

                {error ? (
                  <p className="mt-3 rounded-xl border border-red-400/30 bg-red-950/60 px-3 py-2 text-sm text-red-100">
                    {error}
                  </p>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
                {route?.steps.map((step, index) => (
                  <div
                    key={`${step.instruction}-${index}`}
                    className="flex items-start gap-3 border-b border-white/5 py-3 last:border-0"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-blue-300">
                      <ManeuverIcon type={step.maneuver.type} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{step.instruction}</p>
                      <p className="text-xs text-slate-400">
                        {formatDistance(step.distance)} · {formatDuration(step.duration)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="shrink-0 border-t border-white/10 p-4">
                <button
                  type="button"
                  disabled={!route || isLoadingRoute}
                  onClick={onStartJourney}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 text-sm font-semibold text-white transition-all duration-300 ease-out hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  <RouteIcon className="h-5 w-5" />
                  Start Journey
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
