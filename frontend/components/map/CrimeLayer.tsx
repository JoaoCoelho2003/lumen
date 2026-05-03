"use client";

import { Layer, Source } from "react-map-gl";
import { useCrimeStreets } from "@/app/api/queries/map-data";

// Piecewise linear curve:
// 00h–03h → 1.0 (pico noturno)
// 03h–06h → 1.0→0.3 (amanhecer, desce)
// 06h–15h → 0.3 (dia, mínimo)
// 15h–19h → 0.3→0.65 (tarde, sobe ligeiramente)
// 19h–22h → 0.65→1.0 (noite, sobe)
// 22h–24h → 1.0 (pico noturno)
const CURVE: [number, number][] = [
  [0, 1.0],
  [3, 1.0],
  [6, 0.3],
  [15, 0.3],
  [19, 0.65],
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
          "line-color": "#f97316",
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 16, 3],
          "line-opacity": 0.35 * m,
        }}
        layout={{ "line-cap": "round", "line-join": "round" }}
      />
      <Layer
        id="crime-streets-mid"
        type="line"
        filter={["==", ["get", "crime_level"], "medio"]}
        paint={{
          "line-color": "#ef4444",
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.5, 16, 4],
          "line-opacity": 0.6 * m,
        }}
        layout={{ "line-cap": "round", "line-join": "round" }}
      />
      <Layer
        id="crime-streets-high"
        type="line"
        filter={["==", ["get", "crime_level"], "alto"]}
        paint={{
          "line-color": "#dc2626",
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 2.5, 16, 6],
          "line-opacity": 0.85 * m,
          "line-blur": 1,
        }}
        layout={{ "line-cap": "round", "line-join": "round" }}
      />
    </Source>
  );
}
