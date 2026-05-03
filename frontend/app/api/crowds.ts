import { api } from "./api";
import type { Coordinates, SafeSpot } from "@/lib/types";

export type CrowdHeartbeatInput = {
  clientId: string;
  coordinates: Coordinates;
  accuracyM?: number | null;
};

type CrowdSafeSpotResponse = {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  kind: "crowd";
  distance: number;
  crowd_count: number;
};

export async function sendCrowdHeartbeat({
  clientId,
  coordinates,
  accuracyM,
}: CrowdHeartbeatInput) {
  const [longitude, latitude] = coordinates;
  await api.post("/crowds/heartbeat", {
    client_id: clientId,
    latitude,
    longitude,
    accuracy_m: accuracyM ?? null,
  });
}

export async function getCrowdSafeSpots(
  origin: Coordinates,
): Promise<SafeSpot[]> {
  const [longitude, latitude] = origin;
  const response = await api.get<CrowdSafeSpotResponse[]>(
    "/crowds/safe-spots",
    {
      params: { latitude, longitude },
    },
  );

  return response.data;
}
