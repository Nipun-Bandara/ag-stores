import { describe, expect, it } from "vitest";

import { shopSettingsUpdateSchema } from "@/validations/shop-settings";

const validSettings = {
  shopId: "00000000-0000-4000-8000-000000000001",
  name: "Colombo Market",
  address: "100 Galle Road, Colombo",
  phone: "+94112345678",
  latitude: "6.927079",
  longitude: "79.861244",
  isOpen: true,
  minimumOrderAmount: "500",
  deliveryFee: "125.5",
  maximumDeliveryRadiusKm: "12.5",
};

describe("shop settings validation", () => {
  it("normalizes monetary and radius values without floating-point arithmetic", () => {
    expect(shopSettingsUpdateSchema.parse(validSettings)).toMatchObject({
      latitude: 6.927079,
      longitude: 79.861244,
      minimumOrderAmount: "500.00",
      deliveryFee: "125.50",
      maximumDeliveryRadiusKm: "12.50",
    });
  });

  it.each([
    { minimumOrderAmount: "-0.01" },
    { deliveryFee: "1.001" },
    { maximumDeliveryRadiusKm: "0" },
    { latitude: "91" },
    { longitude: "-181" },
    { phone: "0771234567" },
  ])("rejects invalid commercial or location values: %o", (change) => {
    expect(
      shopSettingsUpdateSchema.safeParse({ ...validSettings, ...change })
        .success,
    ).toBe(false);
  });
});
