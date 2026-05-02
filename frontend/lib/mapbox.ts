import type {
  Coordinates,
  MapboxDirectionsRoute,
  Route,
  RouteStep,
} from "@/lib/types";

const EARTH_RADIUS_METERS = 6_371_000;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

export function calculateBearing(start: Coordinates, end: Coordinates): number {
  const [startLng, startLat] = start;
  const [endLng, endLat] = end;
  const startLatRadians = toRadians(startLat);
  const endLatRadians = toRadians(endLat);
  const longitudeDelta = toRadians(endLng - startLng);

  const y = Math.sin(longitudeDelta) * Math.cos(endLatRadians);
  const x =
    Math.cos(startLatRadians) * Math.sin(endLatRadians) -
    Math.sin(startLatRadians) *
      Math.cos(endLatRadians) *
      Math.cos(longitudeDelta);

  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

export function calculateDistance(
  start: Coordinates,
  end: Coordinates,
): number {
  const [startLng, startLat] = start;
  const [endLng, endLat] = end;
  const latitudeDelta = toRadians(endLat - startLat);
  const longitudeDelta = toRadians(endLng - startLng);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(startLat)) *
      Math.cos(toRadians(endLat)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function interpolatePosition(
  coordinates: Coordinates[],
  distanceTravelled: number,
): Coordinates {
  if (coordinates.length === 0) {
    return [0, 0];
  }

  if (coordinates.length === 1 || distanceTravelled <= 0) {
    return coordinates[0];
  }

  let coveredDistance = 0;

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const start = coordinates[index];
    const end = coordinates[index + 1];
    const segmentDistance = calculateDistance(start, end);

    if (coveredDistance + segmentDistance >= distanceTravelled) {
      const segmentProgress =
        segmentDistance === 0
          ? 0
          : (distanceTravelled - coveredDistance) / segmentDistance;

      return [
        start[0] + (end[0] - start[0]) * segmentProgress,
        start[1] + (end[1] - start[1]) * segmentProgress,
      ];
    }

    coveredDistance += segmentDistance;
  }

  return coordinates[coordinates.length - 1];
}

export function calculateRouteDistance(coordinates: Coordinates[]): number {
  return coordinates.reduce((total, coordinate, index) => {
    if (index === 0) {
      return total;
    }

    return total + calculateDistance(coordinates[index - 1], coordinate);
  }, 0);
}

export function getBearingAtDistance(
  coordinates: Coordinates[],
  distanceTravelled: number,
): number {
  if (coordinates.length < 2) {
    return 0;
  }

  const current = interpolatePosition(coordinates, distanceTravelled);
  const next = interpolatePosition(coordinates, distanceTravelled + 15);

  if (calculateDistance(current, next) < 0.5) {
    return calculateBearing(
      coordinates[coordinates.length - 2],
      coordinates[coordinates.length - 1],
    );
  }

  return calculateBearing(current, next);
}

export function findClosestStepIndex(
  steps: RouteStep[],
  currentPosition: Coordinates,
): number {
  if (steps.length === 0) {
    return 0;
  }

  return steps.reduce(
    (closest, step, index) => {
      const distance = calculateDistance(
        currentPosition,
        step.maneuver.location,
      );

      if (distance < closest.distance) {
        return { index, distance };
      }

      return closest;
    },
    { index: 0, distance: Number.POSITIVE_INFINITY },
  ).index;
}

export function getTravelledCoordinates(
  coordinates: Coordinates[],
  distanceTravelled: number,
): Coordinates[] {
  if (coordinates.length === 0) {
    return [];
  }

  const travelled: Coordinates[] = [coordinates[0]];
  let coveredDistance = 0;

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const start = coordinates[index];
    const end = coordinates[index + 1];
    const segmentDistance = calculateDistance(start, end);

    if (coveredDistance + segmentDistance < distanceTravelled) {
      travelled.push(end);
      coveredDistance += segmentDistance;
      continue;
    }

    travelled.push(interpolatePosition(coordinates, distanceTravelled));
    break;
  }

  return travelled;
}

export function findDistanceAlongRoute(
  coordinates: Coordinates[],
  currentPosition: Coordinates,
): number {
  if (coordinates.length < 2) {
    return 0;
  }

  let distanceBeforeSegment = 0;
  let closestDistanceAlongRoute = 0;
  let closestDistanceToRoute = Number.POSITIVE_INFINITY;

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const start = coordinates[index];
    const end = coordinates[index + 1];
    const segmentDistance = calculateDistance(start, end);
    const segmentLng = end[0] - start[0];
    const segmentLat = end[1] - start[1];
    const segmentLengthSquared =
      segmentLng * segmentLng + segmentLat * segmentLat;
    const projection =
      segmentLengthSquared === 0
        ? 0
        : ((currentPosition[0] - start[0]) * segmentLng +
            (currentPosition[1] - start[1]) * segmentLat) /
          segmentLengthSquared;
    const clampedProjection = Math.max(0, Math.min(1, projection));
    const projectedCoordinate: Coordinates = [
      start[0] + segmentLng * clampedProjection,
      start[1] + segmentLat * clampedProjection,
    ];
    const distanceToRoute = calculateDistance(
      currentPosition,
      projectedCoordinate,
    );

    if (distanceToRoute < closestDistanceToRoute) {
      closestDistanceToRoute = distanceToRoute;
      closestDistanceAlongRoute =
        distanceBeforeSegment + segmentDistance * clampedProjection;
    }

    distanceBeforeSegment += segmentDistance;
  }

  return closestDistanceAlongRoute;
}

export function getBoundsFromCoordinates(coordinates: Coordinates[]) {
  const firstCoordinate = coordinates[0] ?? [-8.2, 39.5];

  return coordinates.reduce(
    (bounds, coordinate) => ({
      minLng: Math.min(bounds.minLng, coordinate[0]),
      minLat: Math.min(bounds.minLat, coordinate[1]),
      maxLng: Math.max(bounds.maxLng, coordinate[0]),
      maxLat: Math.max(bounds.maxLat, coordinate[1]),
    }),
    {
      minLng: firstCoordinate[0],
      minLat: firstCoordinate[1],
      maxLng: firstCoordinate[0],
      maxLat: firstCoordinate[1],
    },
  );
}

export function mapboxRouteToRoute(route: MapboxDirectionsRoute): Route {
  const steps: RouteStep[] = route.legs.flatMap((leg) =>
    leg.steps.map((step) => ({
      instruction: step.maneuver.instruction ?? "Continue",
      maneuver: {
        type: step.maneuver.type,
        modifier: step.maneuver.modifier,
        location: step.maneuver.location,
      },
      distance: step.distance,
      duration: step.duration,
    })),
  );

  return {
    geometry: route.geometry,
    steps,
    distance: route.distance,
    duration: route.duration,
  };
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.max(0, Math.round(meters))} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${remainingMinutes} min`;
}
