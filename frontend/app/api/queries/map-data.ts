"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useMap } from "react-map-gl";
import {
  getCrimeStreets,
  getLightingTile,
  type FeatureCollection,
  type ViewportBounds,
} from "../map-data";

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

function roundCoord(value: number) {
  return Number(value.toFixed(3));
}

function expandBounds(bounds: ViewportBounds, factor = 0.4): ViewportBounds {
  const lonPadding = (bounds.east - bounds.west) * factor;
  const latPadding = (bounds.north - bounds.south) * factor;

  return {
    west: roundCoord(bounds.west - lonPadding),
    south: roundCoord(bounds.south - latPadding),
    east: roundCoord(bounds.east + lonPadding),
    north: roundCoord(bounds.north + latPadding),
  };
}

function containsBounds(outer: ViewportBounds | null, inner: ViewportBounds) {
  if (!outer) return false;

  return (
    outer.west <= inner.west &&
    outer.south <= inner.south &&
    outer.east >= inner.east &&
    outer.north >= inner.north
  );
}

function useViewportQuery(
  enabled: boolean,
  queryPrefix: string,
  queryFn: (bounds: ViewportBounds) => Promise<FeatureCollection>,
) {
  const { current: map } = useMap();
  const [requestBounds, setRequestBounds] = useState<ViewportBounds | null>(
    null,
  );
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !map) return;

    function currentBounds(): ViewportBounds | null {
      if (!map) return null;

      const bounds = map.getBounds();
      if (!bounds) return null;

      return {
        west: roundCoord(bounds.getWest()),
        south: roundCoord(bounds.getSouth()),
        east: roundCoord(bounds.getEast()),
        north: roundCoord(bounds.getNorth()),
      };
    }

    function updateBounds() {
      const viewportBounds = currentBounds();
      if (!viewportBounds) return;

      setRequestBounds((current) =>
        containsBounds(current, viewportBounds)
          ? current
          : expandBounds(viewportBounds),
      );
    }

    function scheduleUpdate() {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(updateBounds, 250);
    }

    scheduleUpdate();
    map.on("moveend", scheduleUpdate);
    map.on("zoomend", scheduleUpdate);

    return () => {
      map.off("moveend", scheduleUpdate);
      map.off("zoomend", scheduleUpdate);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [enabled, map]);

  const query = useQuery({
    queryKey: [queryPrefix, requestBounds],
    queryFn: () => queryFn(requestBounds!),
    enabled: enabled && Boolean(requestBounds),
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  return enabled ? (query.data ?? EMPTY) : EMPTY;
}

export function useLightingTile(enabled: boolean) {
  return useViewportQuery(enabled, "lighting-tile", getLightingTile);
}

export function useCrimeStreets(enabled: boolean) {
  return useViewportQuery(enabled, "crime-streets", getCrimeStreets);
}
