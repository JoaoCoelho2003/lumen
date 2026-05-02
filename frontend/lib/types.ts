export type Coordinates = [number, number];

export type TravelProfile = "driving" | "walking";

export type GeocodingResult = {
  id: string;
  place_name: string;
  center: Coordinates;
  text: string;
  context?: Array<{
    text: string;
  }>;
};

export type SafeSpotKind = "police" | "fire" | "hospital";

export type SafeSpot = {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  kind: SafeSpotKind;
  distance: number;
};

export type RouteStep = {
  instruction: string;
  maneuver: {
    type: string;
    modifier?: string;
    location: Coordinates;
  };
  distance: number;
  duration: number;
};

export type LineStringGeometry = {
  type: "LineString";
  coordinates: Coordinates[];
};

export type Route = {
  origin: Coordinates;
  destination: Coordinates;
  geometry: LineStringGeometry;
  steps: RouteStep[];
  distance: number;
  duration: number;
};

export type RouteWeights = {
  light_weight: number;
  crime_weight: number;
};

export type RankedRoute = {
  name?: string | null;
  source_route_index?: number | null;
  score: number;
  score_percent: number;
  coverage: number;
  longest_dark_run_ratio: number;
  light_points_near_route: number;
  crime_points_near_route: number;
  light_density_per_km: number;
  crime_density_per_km: number;
  distance_km: number;
  duration_minutes?: number | null;
  notes: string[];
  geometry: LineStringGeometry;
};

export type MapboxRouteRankResponse = {
  best_route_index?: number | null;
  ranked_routes: RankedRoute[];
  light_data_loaded: boolean;
  crime_data_loaded: boolean;
  source: string;
};

export type NavigationState = "idle" | "preview" | "navigating";

export type NavigationPosition = {
  coordinates: Coordinates;
  bearing: number;
  stepIndex: number;
  distanceTravelled: number;
};

export type CameraTarget = {
  center: Coordinates;
  bearing: number;
  pitch: number;
  zoom: number;
};

export type MapboxGeocodingFeature = {
  id: string;
  place_name: string;
  center: Coordinates;
  text: string;
  properties?: {
    address?: string;
    category?: string;
  };
  context?: Array<{
    text: string;
  }>;
};

export type MapboxGeocodingResponse = {
  features?: MapboxGeocodingFeature[];
  message?: string;
};

export type MapboxDirectionsStep = {
  maneuver: {
    instruction?: string;
    type: string;
    modifier?: string;
    location: Coordinates;
  };
  distance: number;
  duration: number;
};

export type MapboxDirectionsLeg = {
  steps: MapboxDirectionsStep[];
};

export type MapboxDirectionsRoute = {
  geometry: LineStringGeometry;
  legs: MapboxDirectionsLeg[];
  distance: number;
  duration: number;
};

export type MapboxDirectionsResponse = {
  routes?: MapboxDirectionsRoute[];
  message?: string;
  code?: string;
};
