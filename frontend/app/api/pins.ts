import { api } from "./api";
import type { Coordinates, Pin, PinType } from "@/lib/types";

export async function getPins() {
  try {
    const res = await api.get<Pin[]>("/pins");
    return res.data.map((p) => ({ ...p, id: String(p.id) }));
  } catch {
    throw new Error(`Failed to fetch pins. Please try again later.`);
  }
}

export async function createPin(
  coordinates: Coordinates,
  pin_type: PinType,
  user_id?: string,
): Promise<Pin> {
  try {
    const [longitude, latitude] = coordinates;
    const res = await api.post<Pin>("/pins", {
      latitude,
      longitude,
      pin_type,
      user_id: user_id ?? null,
    });
    return { ...res.data, id: String(res.data.id) };
  } catch {
    throw new Error("Failed to create pin. Please try again later.");
  }
}