import type { LngLatBoundsLike } from "mapbox-gl";

export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export const PORTUGAL_BOUNDS: LngLatBoundsLike = [
  [-11.2, 35.2],
  [-4.8, 43.8],
];

export const DEFAULT_VIEW_STATE = {
  longitude: -8.2,
  latitude: 39.5,
  zoom: 6.1,
  pitch: 0,
  bearing: 0,
};

export const MAP_STYLES = {
  dark: "mapbox://styles/mapbox/dark-v11",
  light: "mapbox://styles/mapbox/light-v11",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
} as const;

export const PORTUGAL_TIME_ZONE = "Europe/Lisbon";

export const DAY_STYLE_START_HOUR = 7;
export const NIGHT_STYLE_START_HOUR = 20;

export const TRAVEL_SPEEDS_METERS_PER_TICK = {
  driving: 15,
  walking: 5,
} as const;

export const NAVIGATION_CAMERA = {
  pitch: 60,
  zoom: 16,
} as const;
