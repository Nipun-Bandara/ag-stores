import { describe, expect, it } from "vitest";

import {
  calculateDistance,
  GeographicCoordinateError,
} from "@/services/geographic-distance.service";

describe("calculateDistance", () => {
  it("matches the known London-to-Paris great-circle distance", () => {
    const distance = calculateDistance(51.5074, -0.1278, 48.8566, 2.3522);
    expect(distance).toBeCloseTo(343.6, 1);
  });

  it("matches the known New York-to-London great-circle distance", () => {
    const distance = calculateDistance(40.7128, -74.006, 51.5074, -0.1278);
    expect(distance).toBeCloseTo(5_570.2, 1);
  });

  it("returns approximately zero for the same location", () => {
    expect(
      calculateDistance(6.927079, 79.861244, 6.927079, 79.861244),
    ).toBeCloseTo(0, 12);
  });

  it("is symmetric regardless of coordinate order", () => {
    const outward = calculateDistance(6.927079, 79.861244, 7.290572, 80.633728);
    const returnTrip = calculateDistance(
      7.290572,
      80.633728,
      6.927079,
      79.861244,
    );
    expect(outward).toBeCloseTo(returnTrip, 12);
  });

  it("accepts valid latitude and longitude boundary values", () => {
    expect(calculateDistance(-90, -180, 90, 180)).toBeCloseTo(20_015.1, 1);
  });

  it.each([
    [91, 79, 0, 0, "shopLatitude"],
    [-91, 79, 0, 0, "shopLatitude"],
    [Number.NaN, 79, 0, 0, "shopLatitude"],
    [6, 79, 90.1, 0, "destinationLatitude"],
    [6, 79, Number.POSITIVE_INFINITY, 0, "destinationLatitude"],
  ] as const)(
    "rejects invalid latitude coordinates",
    (shopLat, shopLon, destinationLat, destinationLon, coordinate) => {
      expect(() =>
        calculateDistance(shopLat, shopLon, destinationLat, destinationLon),
      ).toThrowError(
        expect.objectContaining<Partial<GeographicCoordinateError>>({
          name: "GeographicCoordinateError",
          coordinate,
        }),
      );
    },
  );

  it.each([
    [6, 180.1, 7, 80, "shopLongitude"],
    [6, -180.1, 7, 80, "shopLongitude"],
    [6, Number.NEGATIVE_INFINITY, 7, 80, "shopLongitude"],
    [6, 79, 7, 181, "destinationLongitude"],
    [6, 79, 7, Number.NaN, "destinationLongitude"],
  ] as const)(
    "rejects invalid longitude coordinates",
    (shopLat, shopLon, destinationLat, destinationLon, coordinate) => {
      expect(() =>
        calculateDistance(shopLat, shopLon, destinationLat, destinationLon),
      ).toThrowError(
        expect.objectContaining<Partial<GeographicCoordinateError>>({
          name: "GeographicCoordinateError",
          coordinate,
        }),
      );
    },
  );
});
