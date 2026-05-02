"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSafeSpots } from "../safe-spots";
import type { Coordinates, SafeSpot } from "@/lib/types";

type SafeSpotsState = {
  safeSpots: SafeSpot[];
  isLoadingSafeSpots: boolean;
  safeSpotsError: string | null;
  findSafeSpots: (origin: Coordinates) => Promise<SafeSpot[]>;
};

export function useSafeSpots(): SafeSpotsState {
  const queryClient = useQueryClient();
  const [origin, setOrigin] = useState<Coordinates | null>(null);

  const { data: safeSpots = [], isFetching, error } = useQuery({
    queryKey: ["safe-spots", origin],
    queryFn: () => fetchSafeSpots(origin!),
    enabled: !!origin,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Accepts coordinates imperatively (e.g. after geolocation resolves),
  // updates the query key to trigger a fetch, and returns the result as
  // a promise so callers can await it just like before.
  const findSafeSpots = useCallback(
    async (nextOrigin: Coordinates): Promise<SafeSpot[]> => {
      try {
        setOrigin(nextOrigin);
        return await queryClient.fetchQuery({
          queryKey: ["safe-spots", nextOrigin],
          queryFn: () => fetchSafeSpots(nextOrigin),
          staleTime: 5 * 60 * 1000,
        });
      } catch {
        throw new Error("Failed to fetch safe spots. Please try again later.");
      }
    },
    [queryClient],
  );

  return {
    safeSpots,
    isLoadingSafeSpots: isFetching,
    safeSpotsError: error instanceof Error ? error.message : null,
    findSafeSpots,
  };
}