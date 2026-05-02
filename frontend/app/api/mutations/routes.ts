"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RouteWeights } from "@/lib/types";
import { updateRouteWeights } from "../routes";
import { routeWeightsQueryKey } from "../queries/routes";

export function useUpdateRouteWeightsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (weights: RouteWeights) => updateRouteWeights(weights),
    onSuccess: (weights) => {
      queryClient.setQueryData(routeWeightsQueryKey, weights);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: routeWeightsQueryKey });
    },
  });
}
