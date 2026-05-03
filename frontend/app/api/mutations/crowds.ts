"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendCrowdHeartbeat, type CrowdHeartbeatInput } from "../crowds";

export function useCrowdHeartbeatMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CrowdHeartbeatInput) => sendCrowdHeartbeat(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["safe-spots"] });
    },
  });
}
