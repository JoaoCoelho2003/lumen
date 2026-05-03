import { MAPBOX_TOKEN } from "@/lib/constants";
import { calculateDistance } from "@/lib/mapbox";
import { getCrowdSafeSpots } from "./crowds";
import type {
  Coordinates,
  MapboxGeocodingResponse,
  SafeSpot,
  SafeSpotKind,
} from "@/lib/types";

type OverpassElement = {
  id: number;
  type: "node" | "way" | "relation";
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

const SAFE_SPOT_QUERIES: Array<{ query: string; kind: SafeSpotKind }> = [
  { query: "police station", kind: "police" },
  { query: "esquadra policia", kind: "police" },
  { query: "fire station", kind: "fire" },
  { query: "bombeiros", kind: "fire" },
  { query: "hospital emergency", kind: "hospital" },
  { query: "hospital urgencia", kind: "hospital" },
];

function getSafeSpotAddress(feature: {
  place_name: string;
  text: string;
  properties?: { address?: string };
}) {
  if (feature.properties?.address) return feature.properties.address;
  return feature.place_name.replace(feature.text, "").replace(/^,\s*/, "");
}

function getOverpassSafeSpotKind(tags: Record<string, string>): SafeSpotKind {
  if (tags.amenity === "fire_station" || tags.emergency === "fire_station") return "fire";
  if (tags.amenity === "hospital" || tags.healthcare === "hospital") return "hospital";
  return "police";
}

function getOverpassSafeSpotName(tags: Record<string, string>, kind: SafeSpotKind) {
  if (tags.name) return tags.name;
  if (kind === "fire") return "Fire station";
  if (kind === "hospital") return "Hospital";
  return "Police station";
}

function getOverpassSafeSpotAddress(tags: Record<string, string>) {
  const street = tags["addr:street"];
  const houseNumber = tags["addr:housenumber"];
  const city = tags["addr:city"] ?? tags["addr:place"];
  const streetAddress = [street, houseNumber].filter(Boolean).join(" ");
  return [streetAddress, city].filter(Boolean).join(", ");
}

export function dedupeSafeSpots(safeSpots: SafeSpot[]) {
  const unique = new Map<string, SafeSpot>();

  for (const spot of safeSpots) {
    const coordinateKey = spot.coordinates.map((c) => c.toFixed(5)).join(",");
    const key = `${spot.name.toLowerCase()}-${coordinateKey}`;
    const existing = unique.get(key);
    if (!existing || spot.distance < existing.distance) unique.set(key, spot);
  }

  return Array.from(unique.values()).sort((a, b) => a.distance - b.distance);
}

async function fetchMapboxSafeSpots(origin: Coordinates): Promise<SafeSpot[]> {
  try {
    if (!MAPBOX_TOKEN) return [];

    const results = await Promise.all(
      SAFE_SPOT_QUERIES.map(async ({ query, kind }) => {
        const params = new URLSearchParams({
          access_token: MAPBOX_TOKEN,
          language: "pt",
          limit: "5",
          proximity: origin.join(","),
          types: "poi",
        });
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params.toString()}`,
        );
        const data = (await response.json()) as MapboxGeocodingResponse;

        if (!response.ok) throw new Error(data.message ?? "Could not find Mapbox safe spots.");

        return (
          data.features?.map<SafeSpot>((feature) => ({
            id: `mapbox-${feature.id}`,
            name: feature.text,
            address: getSafeSpotAddress(feature),
            coordinates: feature.center,
            kind,
            distance: calculateDistance(origin, feature.center),
          })) ?? []
        );
      }),
    );

    return results.flat();
  } catch {
    throw new Error("Failed to fetch Mapbox safe spots. Please try again later.");
  }
}

async function fetchOverpassSafeSpots(origin: Coordinates): Promise<SafeSpot[]> {
  try {
    const [longitude, latitude] = origin;
    const radiusMeters = 25_000;
    const query = `
      [out:json][timeout:12];
      (
        node["amenity"="police"](around:${radiusMeters},${latitude},${longitude});
        way["amenity"="police"](around:${radiusMeters},${latitude},${longitude});
        relation["amenity"="police"](around:${radiusMeters},${latitude},${longitude});
        node["amenity"="fire_station"](around:${radiusMeters},${latitude},${longitude});
        way["amenity"="fire_station"](around:${radiusMeters},${latitude},${longitude});
        relation["amenity"="fire_station"](around:${radiusMeters},${latitude},${longitude});
        node["emergency"="fire_station"](around:${radiusMeters},${latitude},${longitude});
        way["emergency"="fire_station"](around:${radiusMeters},${latitude},${longitude});
        relation["emergency"="fire_station"](around:${radiusMeters},${latitude},${longitude});
        node["amenity"="hospital"](around:${radiusMeters},${latitude},${longitude});
        way["amenity"="hospital"](around:${radiusMeters},${latitude},${longitude});
        relation["amenity"="hospital"](around:${radiusMeters},${latitude},${longitude});
        node["healthcare"="hospital"](around:${radiusMeters},${latitude},${longitude});
        way["healthcare"="hospital"](around:${radiusMeters},${latitude},${longitude});
        relation["healthcare"="hospital"](around:${radiusMeters},${latitude},${longitude});
      );
      out center tags 40;
    `;
    const params = new URLSearchParams({ data: query });
    const response = await fetch(`https://overpass-api.de/api/interpreter?${params.toString()}`);
    const data = (await response.json()) as OverpassResponse;

    if (!response.ok) throw new Error("Could not find OpenStreetMap safe spots.");

    return (
      data.elements
        ?.map<SafeSpot | null>((element) => {
          const tags = element.tags ?? {};
          const elementLatitude = element.lat ?? element.center?.lat;
          const elementLongitude = element.lon ?? element.center?.lon;

          if (elementLatitude === undefined || elementLongitude === undefined) return null;

          const coordinates: Coordinates = [elementLongitude, elementLatitude];
          const kind = getOverpassSafeSpotKind(tags);

          return {
            id: `osm-${element.type}-${element.id}`,
            name: getOverpassSafeSpotName(tags, kind),
            address: getOverpassSafeSpotAddress(tags),
            coordinates,
            kind,
            distance: calculateDistance(origin, coordinates),
          };
        })
        .filter((spot): spot is SafeSpot => spot !== null) ?? []
    );
  } catch {
    throw new Error("Failed to fetch OpenStreetMap safe spots. Please try again later.");
  }
}

export async function fetchSafeSpots(origin: Coordinates): Promise<SafeSpot[]> {
  try {
    const [mapboxSpots, overpassSpots, crowdSpots] = await Promise.all([
      fetchMapboxSafeSpots(origin).catch(() => []),
      fetchOverpassSafeSpots(origin).catch(() => []),
      getCrowdSafeSpots(origin).catch(() => []),
    ]);

    const spots = dedupeSafeSpots([
      ...crowdSpots,
      ...overpassSpots,
      ...mapboxSpots,
    ]).slice(0, 20);

    if (spots.length === 0) {
      throw new Error("No safe spots were found nearby.");
    }

    return spots;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Failed to fetch safe spots. Please try again later.");
  }
}
