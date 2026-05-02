"use client";

import { Layer, Source } from "react-map-gl";
import type { ExpressionSpecification } from "mapbox-gl";
import { useViewportGeoJson } from "@/hooks/useViewportGeoJson";

const API_BASE = "/lumen-api";

const HEATMAP_COLOR: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["heatmap-density"],
  0, "rgba(0,0,0,0)",
  0.2, "rgba(80,50,0,0.5)",
  0.5, "#cc8800",
  0.8, "#ffcc00",
  1.0, "#ffffaa",
];

export function HeatmapLayer({ enabled }: { enabled: boolean }) {
  const data = useViewportGeoJson(enabled, `${API_BASE}/api/tile`);

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
