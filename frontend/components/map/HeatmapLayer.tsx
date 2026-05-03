"use client";

import { Layer, Source } from "react-map-gl";
import type { ExpressionSpecification } from "mapbox-gl";
import { useLightingTile } from "@/app/api/queries/map-data";

const HEATMAP_COLOR: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["heatmap-density"],
  0,
  "rgba(0,0,0,0)",
  0.18,
  "rgba(255,245,157,0.18)",
  0.46,
  "rgba(255,235,59,0.28)",
  0.74,
  "rgba(255,214,10,0.38)",
  1,
  "rgba(255,193,7,0.48)",
];

export function HeatmapLayer({ enabled }: { enabled: boolean }) {
  const data = useLightingTile(enabled);

  if (!enabled) return null;

  return (
    <Source id="lamps-heatmap" type="geojson" data={data}>
      <Layer
        id="lamps-heatmap-layer"
        type="heatmap"
        paint={{
          "heatmap-weight": 0.55,
          "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            0.35,
            12,
            0.65,
            15,
            0.85,
            18,
            0.75,
          ],
          "heatmap-color": HEATMAP_COLOR,
          "heatmap-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            8,
            12,
            14,
            14,
            24,
            16,
            34,
            18,
            46,
          ],
          "heatmap-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            9,
            0,
            10.5,
            0.18,
            13,
            0.28,
            16,
            0.34,
            18,
            0.28,
          ],
        }}
      />
    </Source>
  );
}
