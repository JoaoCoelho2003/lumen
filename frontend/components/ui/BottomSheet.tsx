"use client";

import {
  Car,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Footprints,
  Loader2,
  Navigation,
  Route as RouteIcon,
} from "lucide-react";
import { formatDistance, formatDuration } from "@/lib/mapbox";
import type { NavigationState, Route, TravelProfile } from "@/lib/types";

type BottomSheetProps = {
  state: NavigationState;
  route: Route | null;
  destinationName: string;
  profile: TravelProfile;
  isLoadingRoute: boolean;
  error: string | null;
  isExpanded: boolean;
  distanceRemaining: number;
  durationRemaining: number;
  activeStepIndex: number;
  onExpandSearch: () => void;
  onToggleExpanded: () => void;
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

export function BottomSheet({
  state,
  route,
  destinationName,
  profile,
  isLoadingRoute,
  error,
  isExpanded,
  distanceRemaining,
  durationRemaining,
  activeStepIndex,
  onExpandSearch,
  onToggleExpanded,
  onProfileChange,
  onStartJourney,
  onStopNavigation,
}: BottomSheetProps) {
  if (state === "idle") {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
        <button
          type="button"
          onClick={onExpandSearch}
          className="pointer-events-auto flex min-h-14 w-full max-w-md items-center justify-center gap-2 rounded-full border border-white/10 bg-[#0f1117]/95 px-5 text-sm font-semibold text-white shadow-2xl backdrop-blur-md transition-all duration-300 ease-out hover:border-white/20"
        >
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500" />
          </span>
          Where do you want to go?
        </button>
      </div>
    );
  }

  if (state === "navigating") {
    const steps = route?.steps.slice(activeStepIndex) ?? [];

    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-3 z-30 px-3">
        <div
          className={`pointer-events-auto mx-auto max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#0f1117]/95 text-white shadow-2xl backdrop-blur-md transition-all duration-300 ease-out ${
            isExpanded ? "max-h-[48vh]" : "max-h-20"
          }`}
        >
          <div
            onClick={onToggleExpanded}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onToggleExpanded();
              }
            }}
            role="button"
            tabIndex={0}
            className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Remaining</p>
              <p className="text-base font-semibold">
                {formatDuration(durationRemaining)} · {formatDistance(distanceRemaining)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onStopNavigation();
                }}
                className="rounded-xl bg-red-500 px-3 py-2 text-xs font-semibold text-white transition-all duration-300 ease-out hover:bg-red-600"
              >
                Stop
              </button>
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-slate-400" />
              ) : (
                <ChevronUp className="h-5 w-5 text-slate-400" />
              )}
            </div>
          </div>
          {isExpanded ? (
            <div className="max-h-[34vh] overflow-y-auto border-t border-white/10 px-4 py-2">
              {steps.map((step, index) => (
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
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-0 sm:px-4 sm:pb-4">
      <section className="pointer-events-auto mx-auto flex max-h-[55vh] max-w-3xl flex-col rounded-t-2xl border border-white/10 bg-[#0f1117]/95 text-white shadow-2xl backdrop-blur-md transition-all duration-300 ease-out sm:rounded-2xl">
        <div className="border-b border-white/10 px-5 py-4">
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
            {isLoadingRoute ? <Loader2 className="h-5 w-5 animate-spin text-blue-300" /> : null}
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

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
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

        <div className="border-t border-white/10 p-4">
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
      </section>
    </div>
  );
}
