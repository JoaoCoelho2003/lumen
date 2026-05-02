"use client";

import { Flame, Hospital, MapPin, Navigation, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Marker } from "react-map-gl";
import type { Coordinates, NavigationPosition, SafeSpot } from "@/lib/types";

type MarkerLayerProps = {
  origin: Coordinates | null;
  destination: Coordinates | null;
  position: NavigationPosition | null;
  safeSpots: SafeSpot[];
  selectedSafeSpotId: string | null;
  showSafeSpots: boolean;
};

function getSafeSpotStyle(kind: SafeSpot["kind"], selected: boolean) {
  if (kind === "fire") {
    return selected
      ? "border-red-100 bg-red-600 text-white shadow-red-600/30"
      : "border-background/90 bg-card text-red-600 shadow-red-600/20";
  }

  if (kind === "hospital") {
    return selected
      ? "border-green-100 bg-green-600 text-white shadow-green-600/30"
      : "border-background/90 bg-card text-green-600 shadow-green-600/20";
  }

  return selected
    ? "border-blue-100 bg-blue-600 text-white shadow-blue-600/30"
    : "border-background/90 bg-card text-blue-600 shadow-blue-600/20";
}

function SafeSpotMarker({
  safeSpot,
  selected,
  visible,
}: {
  safeSpot: SafeSpot;
  selected: boolean;
  visible: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const Icon =
    safeSpot.kind === "fire"
      ? Flame
      : safeSpot.kind === "hospital"
        ? Hospital
        : ShieldCheck;

  useEffect(() => {
    const transitionDelay = window.setTimeout(() => {
      setMounted(true);
    }, 0);

    return () => window.clearTimeout(transitionDelay);
  }, []);

  const markerVisible = mounted && visible;

  return (
    <Marker
      longitude={safeSpot.coordinates[0]}
      latitude={safeSpot.coordinates[1]}
      anchor="bottom"
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-lg transition-all delay-300 duration-300 ease-out ${
          markerVisible
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-1 scale-75 opacity-0"
        } ${getSafeSpotStyle(safeSpot.kind, selected)}`}
        title={safeSpot.name}
      >
        <Icon className="h-5 w-5" />
      </div>
    </Marker>
  );
}

export function MarkerLayer({
  origin,
  destination,
  position,
  safeSpots,
  selectedSafeSpotId,
  showSafeSpots,
}: MarkerLayerProps) {
  return (
    <>
      {safeSpots.map((safeSpot) => (
        <SafeSpotMarker
          key={safeSpot.id}
          safeSpot={safeSpot}
          selected={safeSpot.id === selectedSafeSpotId}
          visible={showSafeSpots}
        />
      ))}
      {origin && (
        <Marker longitude={origin[0]} latitude={origin[1]} anchor="center">
          <div className="h-5 w-5 rounded-full border-2 border-background/90 bg-primary shadow-lg" />
        </Marker>
      )}
      {destination && (
        <Marker
          longitude={destination[0]}
          latitude={destination[1]}
          anchor="bottom"
        >
          <MapPin
            className="h-9 w-9 fill-destructive text-destructive-foreground drop-shadow-lg"
            strokeWidth={1.8}
          />
        </Marker>
      )}
      {position && (
        <Marker
          longitude={position.coordinates[0]}
          latitude={position.coordinates[1]}
          anchor="center"
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-primary shadow-xl shadow-primary/30"
            style={{ transform: `rotate(${position.bearing}deg)` }}
          >
            <Navigation className="h-6 w-6 fill-primary-foreground text-primary-foreground" />
          </div>
        </Marker>
      )}
    </>
  );
}
