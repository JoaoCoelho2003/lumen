"use client";

import {
  CircleDot,
  CornerDownLeft,
  CornerDownRight,
  MoveUp,
  RotateCcw,
} from "lucide-react";
import { formatDistance } from "@/lib/mapbox";
import type { RouteStep } from "@/lib/types";

type NavigationBarProps = {
  step: RouteStep | null;
  distanceToNextManeuver: number;
};

function ManeuverArrow({
  type,
  modifier,
}: {
  type?: string;
  modifier?: string;
}) {
  if (type === "arrive") {
    return <CircleDot className="h-8 w-8" />;
  }

  if (type === "roundabout" || type === "rotary") {
    return <RotateCcw className="h-8 w-8" />;
  }

  if (modifier?.includes("left")) {
    return <CornerDownLeft className="h-8 w-8" />;
  }

  if (modifier?.includes("right")) {
    return <CornerDownRight className="h-8 w-8" />;
  }

  return <MoveUp className="h-8 w-8" />;
}

export function NavigationBar({
  step,
  distanceToNextManeuver,
}: NavigationBarProps) {
  if (!step) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-40 px-3">
      <div className="pointer-events-auto mx-auto flex max-w-3xl items-center gap-4 rounded-2xl border border-border/60 bg-card/95 px-4 py-4 text-foreground shadow-2xl backdrop-blur-md">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ManeuverArrow
            type={step.maneuver.type}
            modifier={step.maneuver.modifier}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold leading-tight sm:text-xl">
            {step.instruction}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDistance(distanceToNextManeuver)} to next maneuver
          </p>
        </div>
      </div>
    </div>
  );
}
