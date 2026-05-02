"use client";

import { useEffect, useRef, useState } from "react";
import { useMap } from "react-map-gl";

type FeatureCollection = { type: "FeatureCollection"; features: unknown[] };
type Bounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

function roundCoord(value: number) {
  return Number(value.toFixed(3));
}

function expandBounds(bounds: Bounds, factor = 0.4): Bounds {
  const lonPadding = (bounds.east - bounds.west) * factor;
  const latPadding = (bounds.north - bounds.south) * factor;

  return {
    west: roundCoord(bounds.west - lonPadding),
    south: roundCoord(bounds.south - latPadding),
    east: roundCoord(bounds.east + lonPadding),
    north: roundCoord(bounds.north + latPadding),
  };
}

function containsBounds(outer: Bounds | null, inner: Bounds) {
  if (!outer) return false;

  return (
    outer.west <= inner.west &&
    outer.south <= inner.south &&
    outer.east >= inner.east &&
    outer.north >= inner.north
  );
}

function boundsCacheKey(endpoint: string, bounds: Bounds) {
  return `${endpoint}:${bounds.west}:${bounds.south}:${bounds.east}:${bounds.north}`;
}

export function useViewportGeoJson(
  enabled: boolean,
  endpoint: string,
  debounceMs = 250,
) {
  const { current: map } = useMap();
  const [data, setData] = useState<FeatureCollection>(EMPTY);
  const cachedBounds = useRef<Bounds | null>(null);
  const cache = useRef(new Map<string, FeatureCollection>());
  const timer = useRef<number | null>(null);
  const abortController = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled || !map) {
      abortController.current?.abort();
      cachedBounds.current = null;
      return;
    }

    function currentBounds(): Bounds | null {
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

    async function fetchViewportData() {
      const viewportBounds = currentBounds();
      if (!viewportBounds) return;

      if (containsBounds(cachedBounds.current, viewportBounds)) {
        return;
      }

      const requestBounds = expandBounds(viewportBounds);
      const key = boundsCacheKey(endpoint, requestBounds);
      const cached = cache.current.get(key);

      if (cached) {
        cachedBounds.current = requestBounds;
        setData(cached);
        return;
      }

      abortController.current?.abort();
      const controller = new AbortController();
      abortController.current = controller;

      const params = new URLSearchParams({
        lon_min: String(requestBounds.west),
        lat_min: String(requestBounds.south),
        lon_max: String(requestBounds.east),
        lat_max: String(requestBounds.north),
      });

      try {
        const response = await fetch(`${endpoint}?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;

        const nextData = (await response.json()) as FeatureCollection;
        cache.current.set(key, nextData);
        cachedBounds.current = requestBounds;
        setData(nextData);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    function scheduleFetch() {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(fetchViewportData, debounceMs);
    }

    fetchViewportData();
    map.on("moveend", scheduleFetch);
    map.on("zoomend", scheduleFetch);

    return () => {
      map.off("moveend", scheduleFetch);
      map.off("zoomend", scheduleFetch);
      if (timer.current) window.clearTimeout(timer.current);
      abortController.current?.abort();
    };
  }, [debounceMs, enabled, endpoint, map]);

  return enabled ? data : EMPTY;
}
