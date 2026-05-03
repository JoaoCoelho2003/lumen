"use client";

import { Flame, Hospital, MapPin, Navigation, ShieldCheck, Users } from "lucide-react";
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
  zoom: number;
};

function getSafeSpotStyle(kind: SafeSpot["kind"], selected: boolean) {
  if (kind === "crowd") {
    return selected
      ? "border-violet-100 bg-violet-600 text-white shadow-violet-600/30"
      : "border-background/90 bg-card text-violet-600 shadow-violet-600/20";
  }

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
  zoom,
}: {
  safeSpot: SafeSpot;
  selected: boolean;
  visible: boolean;
  zoom: number;
}) {
  const [mounted, setMounted] = useState(false);
  const Icon =
    safeSpot.kind === "crowd"
      ? Users
      : safeSpot.kind === "fire"
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
  const crowdHaloSize =
    zoom >= 15 ? 80 : zoom >= 13 ? 64 : zoom >= 11 ? 48 : 36;
  const crowdMarkerSize = zoom >= 11 ? 40 : 34;
  const crowdHaloOffset = crowdMarkerSize / 2;

  return (
    <Marker
      longitude={safeSpot.coordinates[0]}
      latitude={safeSpot.coordinates[1]}
      anchor="bottom"
    >
      <div
        className={`relative flex flex-col items-center transition-all delay-300 duration-300 ease-out ${
          markerVisible
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-1 scale-75 opacity-0"
        }`}
        title={safeSpot.name}
      >
        {safeSpot.kind === "crowd" && safeSpot.crowd_count ? (
          <span className="mb-1 rounded-full border border-violet-100 bg-violet-600 px-2 py-0.5 text-[11px] font-semibold leading-none text-white shadow-lg shadow-violet-600/25">
            {safeSpot.crowd_count}
          </span>
        ) : null}
        {safeSpot.kind === "crowd" ? (
          <span
            className="absolute left-1/2 -translate-x-1/2 translate-y-1/2 rounded-full bg-violet-500/20 ring-1 ring-violet-500/25"
            style={{
              bottom: crowdHaloOffset,
              height: crowdHaloSize,
              width: crowdHaloSize,
            }}
          />
        ) : null}
        <span
          className={`relative z-10 flex items-center justify-center rounded-full border-2 shadow-lg ${
            safeSpot.kind === "crowd" ? "" : "h-9 w-9"
          } ${getSafeSpotStyle(safeSpot.kind, selected)}`}
          style={
            safeSpot.kind === "crowd"
              ? { height: crowdMarkerSize, width: crowdMarkerSize }
              : undefined
          }
        >
          <Icon className="h-5 w-5" />
        </span>
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
  zoom,
}: MarkerLayerProps) {
  return (
    <>
      {safeSpots.map((safeSpot) => (
        <SafeSpotMarker
          key={safeSpot.id}
          safeSpot={safeSpot}
          selected={safeSpot.id === selectedSafeSpotId}
          visible={showSafeSpots}
          zoom={zoom}
        />
      ))}
      {origin && (
        <Marker longitude={origin[0]} latitude={origin[1]} anchor="center">
          <div className="relative z-50 h-5 w-5 rounded-full border-2 border-background/90 bg-primary shadow-lg" />
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
            className="relative z-50 flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-primary shadow-xl shadow-primary/30"
            style={{ transform: `rotate(${position.bearing}deg)` }}
          >
            <Navigation className="h-6 w-6 fill-primary-foreground text-primary-foreground" />
          </div>
        </Marker>
      )}
    </>
  );
}
