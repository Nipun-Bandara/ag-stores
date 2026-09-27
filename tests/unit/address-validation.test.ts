import { describe, expect, it } from "vitest";

import { addressInputSchema } from "@/validations/address";

const validAddress = {
  label: "Home",
  address: "1 Main Street, Colombo",
  latitude: "6.927079",
  longitude: "79.861244",
};

describe("delivery address validation", () => {
  it("accepts and normalizes valid coordinate strings", () => {
    expect(addressInputSchema.parse(validAddress)).toEqual({
      ...validAddress,
      latitude: 6.927079,
      longitude: 79.861244,
      isDefault: false,
    });
  });

  it("rejects missing required fields", () => {
    expect(
      addressInputSchema.safeParse({ latitude: 6.9, longitude: 79.8 }).success,
    ).toBe(false);
  });

  it.each([
    { ...validAddress, latitude: 90.1 },
    { ...validAddress, latitude: -90.1 },
    { ...validAddress, longitude: 180.1 },
    { ...validAddress, longitude: -180.1 },
    { ...validAddress, latitude: "6.1234567" },
    { ...validAddress, latitude: "0.0000001" },
  ])("rejects invalid coordinates: %#", (input) => {
    expect(addressInputSchema.safeParse(input).success).toBe(false);
  });
});
