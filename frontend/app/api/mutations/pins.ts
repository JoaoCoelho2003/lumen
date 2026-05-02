"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPin } from "../pins";
import type { Coordinates, Pin, PinType } from "@/lib/types";

type CreatePinInput = {
  coordinates: Coordinates;
  pin_type: PinType;
  userId?: string;
};

export function useCreatePinMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ coordinates, pin_type, userId }: CreatePinInput) =>
      createPin(coordinates, pin_type, userId),

    onMutate: async ({ coordinates, pin_type, userId }) => {
      await queryClient.cancelQueries({ queryKey: ["pins"] });

      const previousPins = queryClient.getQueryData<Pin[]>(["pins"]);
      const [longitude, latitude] = coordinates;
      const optimistic: Pin = {
        id: `temp-${Date.now()}`,
        latitude,
        longitude,
        pin_type,
        user_id: userId,
      };

      queryClient.setQueryData<Pin[]>(["pins"], (prev = []) => [
        ...prev,
        optimistic,
      ]);

      return { previousPins };
    },

    onSuccess: (saved, _, context) => {
      // Replace optimistic pin with the real one from the server,
      // guarding against duplicates (backend deduplicates by cluster).
      queryClient.setQueryData<Pin[]>(["pins"], (prev = []) => {
        const withoutOptimistic = prev.filter((p) => !p.id.startsWith("temp-"));
        const alreadyPresent = withoutOptimistic.some((p) => p.id === saved.id);
        return alreadyPresent ? withoutOptimistic : [...withoutOptimistic, saved];
      });
    },

    onError: (_, __, context) => {
      queryClient.setQueryData(["pins"], context?.previousPins);
    },
  });
}
