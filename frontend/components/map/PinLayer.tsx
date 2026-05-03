"use client";

import { useEffect, useMemo, useState } from "react";
import { LightbulbOff, TriangleAlert } from "lucide-react";
import type { ExpressionSpecification } from "mapbox-gl";
import { Layer, Marker, Source } from "react-map-gl";
import { DANGER_CLUSTER_RADIUS_KM } from "@/lib/constants";
import type { Pin, PinType } from "@/lib/types";

const STEPS = 64;
const RADIUS_GROWTH = 0.18;
const MAX_RADIUS_FACTOR = 2.2;
const MIXED_INNER_OFFSET_KM = 0.009;

function circleCoords(
  lng: number,
  lat: number,
  radiusKm: number,
): [number, number][] {
  const latOff = radiusKm / 111.32;
  const lngOff = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const pts: [number, number][] = [];
  for (let i = 0; i <= STEPS; i++) {
    const a = (i / STEPS) * 2 * Math.PI;
    pts.push([lng + lngOff * Math.cos(a), lat + latOff * Math.sin(a)]);
  }
  return pts;
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function lngOffset(lat: number, km: number): number {
  return km / (111.32 * Math.cos((lat * Math.PI) / 180));
}

type SingleCluster = {
  kind: "single";
  lat: number;
  lng: number;
  count: number;
  pin_type: PinType;
};

type MixedCluster = {
  kind: "mixed";
  lat: number;
  lng: number;
  dangerCount: number;
  lightCount: number;
};

type AnyCluster = SingleCluster | MixedCluster;

function groupByType(pins: Pin[]): SingleCluster[] {
  const groups: { lats: number[]; lngs: number[]; pin_type: PinType }[] = [];

  for (const pin of pins) {
    let merged = false;
    for (const g of groups) {
      const cLat = g.lats.reduce((s, v) => s + v, 0) / g.lats.length;
      const cLng = g.lngs.reduce((s, v) => s + v, 0) / g.lngs.length;
      if (
        g.pin_type === pin.pin_type &&
        haversineKm(cLat, cLng, pin.latitude, pin.longitude) <=
          DANGER_CLUSTER_RADIUS_KM
      ) {
        g.lats.push(pin.latitude);
        g.lngs.push(pin.longitude);
        merged = true;
        break;
      }
    }
    if (!merged) {
      groups.push({
        lats: [pin.latitude],
        lngs: [pin.longitude],
        pin_type: pin.pin_type,
      });
    }
  }

  return groups.map((g) => ({
    kind: "single" as const,
    lat: g.lats.reduce((s, v) => s + v, 0) / g.lats.length,
    lng: g.lngs.reduce((s, v) => s + v, 0) / g.lngs.length,
    count: g.lats.length,
    pin_type: g.pin_type,
  }));
}

function buildClusters(pins: Pin[]): AnyCluster[] {
  const singles = groupByType(pins);
  const used = new Set<number>();
  const result: AnyCluster[] = [];

  for (let i = 0; i < singles.length; i++) {
    if (used.has(i)) continue;
    const a = singles[i];

    if (a.pin_type === "dangerous-area") {
      for (let j = 0; j < singles.length; j++) {
        if (used.has(j) || i === j) continue;
        const b = singles[j];
        if (
          b.pin_type === "low-light" &&
          haversineKm(a.lat, a.lng, b.lat, b.lng) <= DANGER_CLUSTER_RADIUS_KM
        ) {
          used.add(i);
          used.add(j);
          result.push({
            kind: "mixed",
            lat: (a.lat + b.lat) / 2,
            lng: (a.lng + b.lng) / 2,
            dangerCount: a.count,
            lightCount: b.count,
          });
          break;
        }
      }
    }

    if (!used.has(i)) {
      used.add(i);
      result.push(a);
    }
  }

  return result;
}

function dangerColor(count: number): string {
  if (count === 1) return "#EF4444";
  if (count === 2) return "#DC2626";
  if (count === 3) return "#B91C1C";
  return "#991B1B";
}

function lightColor(count: number): string {
  if (count === 1) return "#F59E0B";
  if (count === 2) return "#D97706";
  if (count === 3) return "#B45309";
  return "#92400E";
}

function markerTone(pinType: PinType): {
  color: string;
  backgroundColor: string;
  borderColor: string;
} {
  if (pinType === "low-light") {
    return {
      color: "#F59E0B",
      backgroundColor: "rgba(245, 158, 11, 0.15)",
      borderColor: "rgba(245, 158, 11, 0.3)",
    };
  }

  return {
    color: "#EF4444",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  };
}

function clusterRadius(count: number): number {
  return (
    DANGER_CLUSTER_RADIUS_KM *
    Math.min(1 + (count - 1) * RADIUS_GROWTH, MAX_RADIUS_FACTOR)
  );
}

function outerOpacity(count: number): number {
  return Math.min(0.18 + (count - 1) * 0.04, 0.38);
}

function innerOpacity(count: number): number {
  return Math.min(0.42 + (count - 1) * 0.06, 0.68);
}

type GeoFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: { type: "Polygon"; coordinates: [number, number][][] };
};
type GeoCollection = { type: "FeatureCollection"; features: GeoFeature[] };

function makeFeature(
  lng: number,
  lat: number,
  radiusKm: number,
  color: string,
  opacity: number,
): GeoFeature {
  return {
    type: "Feature",
    properties: { color, opacity },
    geometry: {
      type: "Polygon",
      coordinates: [circleCoords(lng, lat, radiusKm)],
    },
  };
}

function clusterFeatures(c: AnyCluster): {
  outer: GeoFeature;
  inners: GeoFeature[];
} {
  if (c.kind === "single") {
    const r = clusterRadius(c.count);
    const color =
      c.pin_type === "low-light" ? lightColor(c.count) : dangerColor(c.count);
    return {
      outer: makeFeature(c.lng, c.lat, r, color, outerOpacity(c.count)),
      inners: [
        makeFeature(c.lng, c.lat, r * 0.28, color, innerOpacity(c.count)),
      ],
    };
  }

  const totalCount = c.dangerCount + c.lightCount;
  const r = clusterRadius(totalCount);
  const off = lngOffset(c.lat, MIXED_INNER_OFFSET_KM);
  const dColor = dangerColor(c.dangerCount);
  const lColor = lightColor(c.lightCount);

  return {
    outer: makeFeature(c.lng, c.lat, r, "#FB923C", outerOpacity(totalCount)),
    inners: [
      makeFeature(
        c.lng + off,
        c.lat,
        r * 0.28,
        dColor,
        innerOpacity(c.dangerCount),
      ),
      makeFeature(
        c.lng - off,
        c.lat,
        r * 0.28,
        lColor,
        innerOpacity(c.lightCount),
      ),
    ],
  };
}

type PinLayerProps = { pins: Pin[]; visible: boolean };

export function PinLayer({ pins, visible }: PinLayerProps) {
  const [mounted, setMounted] = useState(false);
  const clusters = useMemo(() => buildClusters(pins), [pins]);

  const { outerGeo, innerGeo } = useMemo(() => {
    const outerFeatures: GeoFeature[] = [];
    const innerFeatures: GeoFeature[] = [];
    for (const c of clusters) {
      const { outer, inners } = clusterFeatures(c);
      outerFeatures.push(outer);
      innerFeatures.push(...inners);
    }
    return {
      outerGeo: {
        type: "FeatureCollection" as const,
        features: outerFeatures,
      } as GeoCollection,
      innerGeo: {
        type: "FeatureCollection" as const,
        features: innerFeatures,
      } as GeoCollection,
    };
  }, [clusters]);

  useEffect(() => {
    const transitionDelay = window.setTimeout(() => {
      setMounted(true);
    }, 0);

    return () => window.clearTimeout(transitionDelay);
  }, []);

  if (pins.length === 0) return null;

  const markerVisible = mounted && visible;
  const fillOpacity: ExpressionSpecification | number = markerVisible
    ? ["get", "opacity"]
    : 0;

  return (
    <>
      <Source id="pins-outer" type="geojson" data={outerGeo}>
        <Layer
          id="pins-outer-fill"
          type="fill"
          paint={{
            "fill-color": ["get", "color"],
            "fill-opacity": fillOpacity,
            "fill-opacity-transition": { duration: 300, delay: 300 },
          }}
        />
      </Source>
      <Source id="pins-inner" type="geojson" data={innerGeo}>
        <Layer
          id="pins-inner-fill"
          type="fill"
          paint={{
            "fill-color": ["get", "color"],
            "fill-opacity": fillOpacity,
            "fill-opacity-transition": { duration: 300, delay: 300 },
          }}
        />
      </Source>

      {clusters.map((c, i) => {
        const isMixed = c.kind === "mixed";

        return (
          <Marker
            key={`icon-${i}`}
            longitude={c.lng}
            latitude={c.lat}
            anchor="center"
          >
            <div
              className={`transition-all delay-300 duration-300 ease-out ${
                markerVisible
                  ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                  : "pointer-events-none translate-y-1 scale-75 opacity-0"
              }`}
            >
              {isMixed ? (
                <div className="flex overflow-hidden rounded-full bg-card/95 shadow-lg ring-1 ring-black/25 backdrop-blur-sm">
                  <div
                    className="flex items-center justify-center"
                    style={{
                      backgroundColor:
                        markerTone("dangerous-area").backgroundColor,
                      borderColor: markerTone("dangerous-area").borderColor,
                      color: markerTone("dangerous-area").color,
                      borderWidth: 1,
                      width: 30,
                      height: 30,
                    }}
                  >
                    <TriangleAlert className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </div>
                  <div
                    className="flex items-center justify-center"
                    style={{
                      backgroundColor: markerTone("low-light").backgroundColor,
                      borderColor: markerTone("low-light").borderColor,
                      color: markerTone("low-light").color,
                      borderWidth: 1,
                      width: 30,
                      height: 30,
                    }}
                  >
                    <LightbulbOff className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </div>
                </div>
              ) : (
                <div
                  className="flex items-center justify-center rounded-full bg-card/95 shadow-lg ring-1 ring-black/25 backdrop-blur-sm"
                  style={{
                    width: 30,
                    height: 30,
                    backgroundColor: markerTone(c.pin_type).backgroundColor,
                    borderColor: markerTone(c.pin_type).borderColor,
                    color: markerTone(c.pin_type).color,
                    borderWidth: 1,
                  }}
                >
                  {c.pin_type === "low-light" ? (
                    <LightbulbOff className="h-3.5 w-3.5" strokeWidth={2.2} />
                  ) : (
                    <TriangleAlert className="h-3.5 w-3.5" strokeWidth={2.2} />
                  )}
                </div>
              )}
            </div>
          </Marker>
        );
      })}
    </>
  );
}
