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
