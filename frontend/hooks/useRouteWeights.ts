"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUpdateRouteWeightsMutation } from "@/app/api/mutations/routes";
import { useRouteWeightsQuery } from "@/app/api/queries/routes";
import { DEFAULT_ROUTE_WEIGHTS, normalizeRouteWeights } from "@/app/api/routes";
import type { RouteWeights } from "../lib/types";

type RouteWeightsState = {
  weights: RouteWeights;
  draftWeights: RouteWeights;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  hasPendingChanges: boolean;
  setLightWeight: (value: number) => void;
  setCrimeWeight: (value: number) => void;
  saveWeights: () => Promise<void>;
};

export function useRouteWeights(): RouteWeightsState {
  const weightsQuery = useRouteWeightsQuery();
  const updateWeightsMutation = useUpdateRouteWeightsMutation();
  const [weights, setWeights] = useState<RouteWeights>(DEFAULT_ROUTE_WEIGHTS);
  const [draftWeights, setDraftWeights] = useState<RouteWeights>(
    DEFAULT_ROUTE_WEIGHTS,
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  const hasPendingChanges = useMemo(
    () =>
      weights.light_weight !== draftWeights.light_weight ||
      weights.crime_weight !== draftWeights.crime_weight,
    [draftWeights, weights],
  );

  useEffect(() => {
    if (!weightsQuery.data) {
      return;
    }

    const nextWeights = normalizeRouteWeights(weightsQuery.data);
    const syncWeights = window.setTimeout(() => {
      setWeights(nextWeights);
      setDraftWeights(nextWeights);
    }, 0);

    return () => window.clearTimeout(syncWeights);
  }, [weightsQuery.data]);

  const setLightWeight = useCallback((value: number) => {
    setSaveError(null);
    setDraftWeights((current) => ({ ...current, light_weight: value }));
  }, []);

  const setCrimeWeight = useCallback((value: number) => {
    setSaveError(null);
    setDraftWeights((current) => ({ ...current, crime_weight: value }));
  }, []);

  const saveWeights = useCallback(async () => {
    setSaveError(null);

    try {
      const data = await updateWeightsMutation.mutateAsync(draftWeights);
      const nextWeights = normalizeRouteWeights(data);
      setWeights(nextWeights);
      setDraftWeights(nextWeights);
    } catch (saveError) {
      setSaveError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save route weights.",
      );
      throw saveError;
    }
  }, [draftWeights, updateWeightsMutation]);

  const queryError =
    weightsQuery.error instanceof Error ? weightsQuery.error.message : null;

  return {
    weights,
    draftWeights,
    isLoading: weightsQuery.isLoading,
    isSaving: updateWeightsMutation.isPending,
    error: saveError ?? queryError,
    hasPendingChanges,
    setLightWeight,
    setCrimeWeight,
    saveWeights,
  };
}
