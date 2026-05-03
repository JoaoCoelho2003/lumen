"use client";

import { useEffect, useMemo, useState } from "react";
import { useCrowdHeartbeatMutation } from "@/app/api/mutations/crowds";
import type { Coordinates } from "@/lib/types";

const CLIENT_ID_STORAGE_KEY = "lumen:crowd-client-id";
const CROWD_OPT_IN_STORAGE_KEY = "lumen:crowd-presence-enabled";
const HEARTBEAT_INTERVAL_MS = 45_000;

function getOrCreateClientId() {
  const existing = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY);
  if (existing) return existing;

  const nextId =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, nextId);
  return nextId;
}

export function useCrowdPresence(coordinates: Coordinates | null) {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(CROWD_OPT_IN_STORAGE_KEY) === "true";
  });
  const { mutate } = useCrowdHeartbeatMutation();

  const clientId = useMemo(() => {
    if (typeof window === "undefined") return null;
    return getOrCreateClientId();
  }, []);

  useEffect(() => {
    if (!enabled || !coordinates || !clientId) {
      return;
    }

    function sendHeartbeat() {
      mutate({
        clientId: clientId!,
        coordinates: coordinates!,
      });
    }

    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [clientId, coordinates, enabled, mutate]);

  function setCrowdPresenceEnabled(nextEnabled: boolean) {
    window.localStorage.setItem(
      CROWD_OPT_IN_STORAGE_KEY,
      nextEnabled ? "true" : "false",
    );
    setEnabled(nextEnabled);
  }

  return {
    crowdPresenceEnabled: enabled,
    setCrowdPresenceEnabled,
    isSharingCrowdPresence: enabled && Boolean(coordinates),
  };
}
