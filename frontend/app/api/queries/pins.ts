"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPins } from "../pins";
import { useCreatePinMutation } from "../mutations/pins";
import type { Coordinates, PinType } from "@/lib/types";

export function useGetPins() {
  const { data: pins = [] } = useQuery({
    queryKey: ["pins"],
    queryFn: getPins,
    staleTime: 10_000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  return pins;
}

export function useCreatePin() {
  const { mutateAsync } = useCreatePinMutation();

  const addPin = useCallback(
    async (
      coordinates: Coordinates,
      pin_type: PinType,
      userId?: string,
    ): Promise<boolean> => {
      try {
        await mutateAsync({ coordinates, pin_type, userId });
        return true;
      } catch {
        return false;
      }
    },
    [mutateAsync],
  );

  return addPin;
}
