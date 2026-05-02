"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getRouteWeights,
  rankMapboxRoutes,
  type RankMapboxRoutesInput,
} from "../routes";

export const routeWeightsQueryKey = ["routes", "weights"] as const;

export function useRankMapboxRoutes(input: RankMapboxRoutesInput | null) {
  return useQuery({
    queryKey: ["routes", "rank-mapbox", input],
    queryFn: () => rankMapboxRoutes(input!),
    enabled: Boolean(input && input.routes.length > 0),
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useRouteWeightsQuery() {
  return useQuery({
    queryKey: routeWeightsQueryKey,
    queryFn: getRouteWeights,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
