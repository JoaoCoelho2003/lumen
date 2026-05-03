import { api } from "./api";

export type FeatureCollection = {
  type: "FeatureCollection";
  features: unknown[];
};

export type ViewportBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

function boundsParams(bounds: ViewportBounds) {
  return {
    lon_min: bounds.west,
    lat_min: bounds.south,
    lon_max: bounds.east,
    lat_max: bounds.north,
  };
}

export async function getLightingTile(bounds: ViewportBounds) {
  const response = await api.get<FeatureCollection>("/api/tile", {
    params: boundsParams(bounds),
  });
  return response.data;
}

export async function getCrimeStreets(bounds: ViewportBounds) {
  const response = await api.get<FeatureCollection>("/api/crime-streets", {
    params: boundsParams(bounds),
  });
  return response.data;
}
