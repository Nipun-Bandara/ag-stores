import { describe, expect, it } from "vitest";

import { registrationSchema } from "@/validations/auth";

describe("customer registration validation", () => {
  const validRegistration = {
    name: "Test Customer",
    email: "CUSTOMER@example.com",
    phone: "",
    password: "SecurePassword123!",
    preferredLanguage: "EN",
  };

  it("normalizes a valid customer registration", () => {
    expect(registrationSchema.parse(validRegistration)).toEqual({
      name: "Test Customer",
      email: "customer@example.com",
      phone: undefined,
      password: "SecurePassword123!",
      preferredLanguage: "EN",
    });
  });

  it("accepts a phone number when email is omitted", () => {
    expect(
      registrationSchema.safeParse({
        ...validRegistration,
        email: "",
        phone: "+94771234567",
      }).success,
    ).toBe(true);
  });

  it("requires email or phone and a strong password", () => {
    expect(
      registrationSchema.safeParse({
        ...validRegistration,
        email: "",
        phone: "",
        password: "weak",
      }).success,
    ).toBe(false);
  });

  it("does not accept a public role field", () => {
    const result = registrationSchema.parse({
      ...validRegistration,
      role: "ADMIN",
    });

    expect(result).not.toHaveProperty("role");
  });
});
