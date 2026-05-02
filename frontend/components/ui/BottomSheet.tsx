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
  onToggleExpanded,
  onProfileChange,
  onStartJourney,
  onStopNavigation,
}: BottomSheetProps) {
  if (state === "idle") {
    return null;
  }

  if (state === "navigating") {
    const steps = route?.steps.slice(activeStepIndex) ?? [];

    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-3 z-30 px-3">
        <div
          className={`pointer-events-auto mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border/60 bg-card/95 text-foreground shadow-2xl backdrop-blur-md transition-all duration-300 ease-out ${
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
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Remaining
              </p>
              <p className="text-base font-semibold">
                {formatDuration(durationRemaining)} ·{" "}
                {formatDistance(distanceRemaining)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onStopNavigation();
                }}
                className="rounded-xl bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground transition-all duration-300 ease-out hover:bg-destructive/90"
              >
                Stop
              </button>
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>
          {isExpanded && (
            <div className="max-h-[34vh] overflow-y-auto border-t border-border/60 px-4 py-2">
              {steps.map((step, index) => (
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
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-0 sm:px-4 sm:pb-4">
      <section className="pointer-events-auto mx-auto flex max-h-[55vh] max-w-3xl flex-col rounded-t-2xl border border-border/60 bg-card/95 text-foreground shadow-2xl backdrop-blur-md transition-all duration-300 ease-out sm:rounded-2xl">
        <div className="border-b border-border/60 px-5 py-4">
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

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
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

        <div className="border-t border-border/60 p-4">
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
      </section>
    </div>
  );
}
