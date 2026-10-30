const EARTH_MEAN_RADIUS_KM = 6_371.0088;

export class GeographicCoordinateError extends RangeError {
  constructor(
    readonly coordinate:
      | "shopLatitude"
      | "shopLongitude"
      | "destinationLatitude"
      | "destinationLongitude",
    message: string,
  ) {
    super(message);
    this.name = "GeographicCoordinateError";
  }
}

function assertLatitude(
  value: number,
  coordinate: "shopLatitude" | "destinationLatitude",
): void {
  if (!Number.isFinite(value) || value < -90 || value > 90) {
    throw new GeographicCoordinateError(
      coordinate,
      `${coordinate} must be a finite number between -90 and 90 degrees.`,
    );
  }
}

function assertLongitude(
  value: number,
  coordinate: "shopLongitude" | "destinationLongitude",
): void {
  if (!Number.isFinite(value) || value < -180 || value > 180) {
    throw new GeographicCoordinateError(
      coordinate,
      `${coordinate} must be a finite number between -180 and 180 degrees.`,
    );
  }
}

/**
 * Calculates great-circle distance using the Haversine formula.
 * This is straight-line geographic distance, not road or routing distance.
 */
export function calculateDistance(
  shopLatitude: number,
  shopLongitude: number,
  destinationLatitude: number,
  destinationLongitude: number,
): number {
  assertLatitude(shopLatitude, "shopLatitude");
  assertLongitude(shopLongitude, "shopLongitude");
  assertLatitude(destinationLatitude, "destinationLatitude");
  assertLongitude(destinationLongitude, "destinationLongitude");

  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(destinationLatitude - shopLatitude);
  const longitudeDelta = radians(destinationLongitude - shopLongitude);
  const startLatitude = radians(shopLatitude);
  const endLatitude = radians(destinationLatitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  const clampedHaversine = Math.min(1, Math.max(0, haversine));
  const centralAngle =
    2 *
    Math.atan2(Math.sqrt(clampedHaversine), Math.sqrt(1 - clampedHaversine));

  return EARTH_MEAN_RADIUS_KM * centralAngle;
}
