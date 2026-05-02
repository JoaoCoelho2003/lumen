"use client";

import { Layer, Source } from "react-map-gl";
import { getTravelledCoordinates } from "@/lib/mapbox";
import type { Route } from "@/lib/types";

type RouteLayerProps = {
  route: Route | null;
  distanceTravelled: number;
};

export function RouteLayer({ route, distanceTravelled }: RouteLayerProps) {
  if (!route) {
    return null;
  }

  const travelledCoordinates = getTravelledCoordinates(
    route.geometry.coordinates,
    distanceTravelled,
  );
  const travelledGeometry = {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates: travelledCoordinates,
    },
  };
  const routeGeometry = {
    type: "Feature" as const,
    properties: {},
    geometry: route.geometry,
  };

  return (
    <>
      <Source id="route-source" type="geojson" data={routeGeometry}>
        <Layer
          id="route-glow"
          type="line"
          paint={{
            "line-color": "#FFFFFF",
            "line-opacity": 0.2,
            "line-width": 10,
          }}
          layout={{
            "line-cap": "round",
            "line-join": "round",
          }}
        />
        <Layer
          id="route-line"
          type="line"
          paint={{
            "line-color": "#3B82F6",
            "line-width": 5,
          }}
          layout={{
            "line-cap": "round",
            "line-join": "round",
          }}
        />
      </Source>
      {travelledCoordinates.length > 1 ? (
        <Source id="travelled-source" type="geojson" data={travelledGeometry}>
          <Layer
            id="travelled-line"
            type="line"
            paint={{
              "line-color": "#6B7280",
              "line-width": 5,
            }}
            layout={{
              "line-cap": "round",
              "line-join": "round",
            }}
          />
        </Source>
      ) : null}
    </>
  );
}
