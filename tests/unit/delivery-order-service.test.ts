import { describe, expect, it } from "vitest";

import {
  calculateDistanceKm,
  toGeneralDeliveryArea,
} from "@/services/delivery-order.service";

describe("delivery order presentation helpers", () => {
  it("calculates a stable great-circle distance", () => {
    const distance = calculateDistanceKm(
      { latitude: 6.906944, longitude: 79.85 },
      { latitude: 6.927079, longitude: 79.861244 },
    );
    expect(distance).toBeGreaterThan(2);
    expect(distance).toBeLessThan(3);
  });

  it("reduces a full address to a general area", () => {
    expect(toGeneralDeliveryArea("42 Secret Lane, Colombo 05, Colombo")).toBe(
      "Colombo 05, Colombo",
    );
    expect(toGeneralDeliveryArea("42 Secret Lane")).toBe("Area unavailable");
  });
});
