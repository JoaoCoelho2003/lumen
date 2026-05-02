"use client";

import { useEffect, useRef, useState } from "react";
import { Layer, Source, useMap } from "react-map-gl";

const API_BASE = "/lumen-api";

const HEATMAP_COLOR = [
  "interpolate",
  ["linear"],
  ["heatmap-density"],
  0, "rgba(0,0,0,0)",
  0.2, "rgba(80,50,0,0.5)",
  0.5, "#cc8800",
  0.8, "#ffcc00",
  1.0, "#ffffaa",
] as const;

type FeatureCollection = { type: "FeatureCollection"; features: unknown[] };

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

export function HeatmapLayer({ enabled }: { enabled: boolean }) {
  const { current: map } = useMap();
  const [data, setData] = useState<FeatureCollection>(EMPTY);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !map) {
      setData(EMPTY);
      return;
    }

    function fetchTile() {
      if (!map) return;
      const b = map.getBounds();
      if (!b) return;
      const zoom = map.getZoom();
      const url =
        `${API_BASE}/api/tile` +
        `?lon_min=${b.getWest().toFixed(5)}&lat_min=${b.getSouth().toFixed(5)}` +
        `&lon_max=${b.getEast().toFixed(5)}&lat_max=${b.getNorth().toFixed(5)}` +
        `&zoom=${zoom.toFixed(1)}`;

      fetch(url)
        .then((r) => r.json())
        .then(setData)
        .catch(() => {});
    }

    function schedule() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(fetchTile, 300);
    }

    fetchTile();
    map.on("moveend", schedule);

    return () => {
      map.off("moveend", schedule);
      if (timer.current) clearTimeout(timer.current);
      setData(EMPTY);
    };
  }, [enabled, map]);

  if (!enabled) return null;

  return (
    <Source id="lamps-heatmap" type="geojson" data={data}>
      <Layer
        id="lamps-heatmap-layer"
        type="heatmap"
        paint={{
          "heatmap-weight": 1,
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 10, 5],
          "heatmap-color": HEATMAP_COLOR,
          "heatmap-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,  1,
            6,  2,
            10, 5,
            14, 10,
            18, 20,
          ],
          "heatmap-opacity": 0.35,
        }}
      />
    </Source>
  );
}
