import axios from "axios";
import { api } from "./api";
import type {
  MapboxDirectionsRoute,
  MapboxRouteRankResponse,
  RouteWeights,
} from "@/lib/types";

export type RankMapboxRoutesInput = {
  routes: MapboxDirectionsRoute[];
  light_weight: number;
  crime_weight: number;
  sample_spacing_m?: number;
};

export const DEFAULT_ROUTE_WEIGHTS: RouteWeights = {
  light_weight: 1,
  crime_weight: 1,
};

export function normalizeRouteWeights(
  input?: Partial<RouteWeights> | null,
): RouteWeights {
  return {
    light_weight:
      typeof input?.light_weight === "number" ? input.light_weight : 1,
    crime_weight:
      typeof input?.crime_weight === "number" ? input.crime_weight : 1,
  };
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { detail?: string; message?: string }
      | undefined;
    return data?.detail ?? data?.message ?? fallback;
  }

  return error instanceof Error ? error.message : fallback;
}

export async function rankMapboxRoutes({
  routes,
  light_weight,
  crime_weight,
  sample_spacing_m = 50,
}: RankMapboxRoutesInput): Promise<MapboxRouteRankResponse> {
  try {
    const response = await api.post<MapboxRouteRankResponse>(
      "/routes/rank-mapbox",
      {
        response: { routes },
        light_weight,
        crime_weight,
        sample_spacing_m,
      },
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Could not rank route alternatives."),
    );
  }
}

export async function getRouteWeights(): Promise<RouteWeights> {
  try {
    const response = await api.get<Partial<RouteWeights>>("/routes/weights");
    return normalizeRouteWeights(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load route weights."));
  }
}

export async function updateRouteWeights(
  weights: RouteWeights,
): Promise<RouteWeights> {
  try {
    const response = await api.put<RouteWeights>("/routes/weights", weights);
    return normalizeRouteWeights(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not save route weights."));
  }
}
