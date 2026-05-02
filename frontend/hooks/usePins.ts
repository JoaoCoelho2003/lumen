"use client";

import { useCallback, useEffect, useState } from "react";
import type { Coordinates, Pin, PinType } from "@/lib/types";

const PINS_URL = "/api/pins";

function normalizePins(raw: unknown[]): Pin[] {
  return (raw as Record<string, unknown>[]).map((p) => ({
    ...p,
    id: String(p.id),
  })) as Pin[];
}

export function usePins() {
  const [pins, setPins] = useState<Pin[]>([]);

  const fetchPins = useCallback(() => {
    fetch(PINS_URL)
      .then((r) => r.json())
      .then((data: unknown[]) => setPins(normalizePins(data)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchPins();
    const interval = window.setInterval(fetchPins, 15_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchPins();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchPins]);

  const addPin = useCallback(
    async (
      coordinates: Coordinates,
      pin_type: PinType,
      userId?: string,
    ): Promise<boolean> => {
      const [longitude, latitude] = coordinates;
      const tempId = `temp-${Date.now()}`;
      const optimistic: Pin = { id: tempId, latitude, longitude, pin_type, user_id: userId };

      setPins((prev) => [...prev, optimistic]);

      try {
        const res = await fetch(PINS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude, longitude, pin_type, user_id: userId ?? null }),
        });

        if (!res.ok) throw new Error(`${res.status}`);

        const raw = (await res.json()) as Record<string, unknown>;
        const saved: Pin = { ...raw, id: String(raw.id) } as Pin;

        setPins((prev) => {
          const withoutTemp = prev.filter((p) => p.id !== tempId);
          // backend may return an existing pin (dedup) — avoid duplicating it
          const alreadyPresent = withoutTemp.some((p) => p.id === saved.id);
          return alreadyPresent ? withoutTemp : [...withoutTemp, saved];
        });

        return true;
      } catch {
        setPins((prev) => prev.filter((p) => p.id !== tempId));
        return false;
      }
    },
    [],
  );

  return { pins, addPin };
}
