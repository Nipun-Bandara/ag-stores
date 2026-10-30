import { describe, expect, it } from "vitest";

import { adminShopInputSchema } from "@/validations/admin-shop";

const validInput = {
  ownerId: "3555bdd7-b560-41e8-9db0-7d9e5490f705",
  name: "Central Market",
  address: "100 Market Road, Colombo",
  phone: "+94112345678",
  latitude: "6.927079",
  longitude: "79.861244",
  isOpen: true,
  minimumOrderAmount: "500",
  deliveryFee: "125.5",
  maximumDeliveryRadiusKm: "20",
};

describe("admin shop validation", () => {
  it("normalizes validated commercial settings", () => {
    expect(adminShopInputSchema.parse(validInput)).toMatchObject({
      minimumOrderAmount: "500.00",
      deliveryFee: "125.50",
      maximumDeliveryRadiusKm: "20.00",
      latitude: 6.927079,
      longitude: 79.861244,
    });
  });

  it.each([
    { ownerId: "not-a-user" },
    { latitude: "91" },
    { longitude: "-181" },
    { minimumOrderAmount: "-1" },
    { maximumDeliveryRadiusKm: "0" },
  ])("rejects invalid shop data: %o", (override) => {
    expect(
      adminShopInputSchema.safeParse({ ...validInput, ...override }).success,
    ).toBe(false);
  });
});
