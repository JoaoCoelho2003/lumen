"use client";

import { Layer, Source } from "react-map-gl";
import { useCrimeStreets } from "@/app/api/queries/map-data";

// Piecewise linear curve:
// 00h-03h -> 1.0 night peak
// 03h-06h -> 1.0 to 0.45 sunrise decrease
// 06h-15h -> 0.45 daytime minimum
// 15h-19h -> 0.45 to 0.7 late-day increase
// 19h-22h -> 0.7 to 1.0 evening increase
// 22h-24h -> 1.0 night peak
const CURVE: [number, number][] = [
  [0, 1.0],
  [3, 1.0],
  [6, 0.45],
  [15, 0.45],
  [19, 0.7],
  [22, 1.0],
  [24, 1.0],
];

export function crimeMultiplier(hour: number): number {
  for (let i = 0; i < CURVE.length - 1; i++) {
    const [h0, v0] = CURVE[i];
    const [h1, v1] = CURVE[i + 1];
    if (hour >= h0 && hour < h1) {
      const t = (hour - h0) / (h1 - h0);
      return v0 + t * (v1 - v0);
    }
  }
  return 1.0;
}

export function CrimeLayer({
  enabled,
  hour,
}: {
  enabled: boolean;
  hour: number;
}) {
  const data = useCrimeStreets(enabled);

  if (!enabled) return null;

  const m = crimeMultiplier(hour);

  return (
    <Source id="crime-streets" type="geojson" data={data}>
      <Layer
        id="crime-streets-low"
        type="line"
        filter={["==", ["get", "crime_level"], "baixo"]}
        paint={{
          "line-color": "#fb923c",
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.4, 16, 3.5],
          "line-opacity": 0.52 * m,
        }}
        layout={{ "line-cap": "round", "line-join": "round" }}
      />
      <Layer
        id="crime-streets-mid"
        type="line"
        filter={["==", ["get", "crime_level"], "medio"]}
        paint={{
          "line-color": "#f87171",
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 2, 16, 4.5],
          "line-opacity": 0.72 * m,
        }}
        layout={{ "line-cap": "round", "line-join": "round" }}
      />
      <Layer
        id="crime-streets-high"
        type="line"
        filter={["==", ["get", "crime_level"], "alto"]}
        paint={{
          "line-color": "#ef4444",
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 3, 16, 6.5],
          "line-opacity": 0.9 * m,
          "line-blur": 0.6,
        }}
        layout={{ "line-cap": "round", "line-join": "round" }}
      />
    </Source>
  );
}
