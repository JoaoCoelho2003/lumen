"use client";

import { MapPin, Navigation } from "lucide-react";
import { Marker } from "react-map-gl";
import type { Coordinates, NavigationPosition } from "@/lib/types";

type MarkerLayerProps = {
  origin: Coordinates | null;
  destination: Coordinates | null;
  position: NavigationPosition | null;
};

export function MarkerLayer({
  origin,
  destination,
  position,
}: MarkerLayerProps) {
  return (
    <>
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
