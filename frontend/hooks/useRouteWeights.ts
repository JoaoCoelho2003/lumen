"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchBackendJson } from "../lib/backend";
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

const DEFAULT_WEIGHTS: RouteWeights = {
  light_weight: 1,
  crime_weight: 1,
};

function normalizeWeights(input?: Partial<RouteWeights> | null): RouteWeights {
  return {
    light_weight:
      typeof input?.light_weight === "number" ? input.light_weight : 1,
    crime_weight:
      typeof input?.crime_weight === "number" ? input.crime_weight : 1,
  };
}

export function useRouteWeights(): RouteWeightsState {
  const [weights, setWeights] = useState<RouteWeights>(DEFAULT_WEIGHTS);
  const [draftWeights, setDraftWeights] = useState<RouteWeights>(DEFAULT_WEIGHTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPendingChanges = useMemo(
    () =>
      weights.light_weight !== draftWeights.light_weight ||
      weights.crime_weight !== draftWeights.crime_weight,
    [draftWeights, weights],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadWeights() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchBackendJson<Partial<RouteWeights>>(
          "/routes/weights",
        );
        if (cancelled) {
          return;
        }

        const nextWeights = normalizeWeights(data);
        setWeights(nextWeights);
        setDraftWeights(nextWeights);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load route weights.",
        );
        setWeights(DEFAULT_WEIGHTS);
        setDraftWeights(DEFAULT_WEIGHTS);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadWeights();

    return () => {
      cancelled = true;
    };
  }, []);

  const setLightWeight = useCallback((value: number) => {
    setDraftWeights((current) => ({ ...current, light_weight: value }));
  }, []);

  const setCrimeWeight = useCallback((value: number) => {
    setDraftWeights((current) => ({ ...current, crime_weight: value }));
  }, []);

  const saveWeights = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      const data = await fetchBackendJson<RouteWeights>("/routes/weights", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draftWeights),
      });

      const nextWeights = normalizeWeights(data);
      setWeights(nextWeights);
      setDraftWeights(nextWeights);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save route weights.",
      );
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }, [draftWeights]);

  return {
    weights,
    draftWeights,
    isLoading,
    isSaving,
    error,
    hasPendingChanges,
    setLightWeight,
    setCrimeWeight,
    saveWeights,
  };
}