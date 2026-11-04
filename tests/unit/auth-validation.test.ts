import { describe, expect, it } from "vitest";
import {
  loginSchema,
  registrationSchema,
  passwordSchema,
} from "@/validations/auth";
import { normalizeMobile, personNameSchema } from "@/lib/account-identity";

describe("mobile account validation", () => {
  const valid = {
    firstName: "  අමා  ",
    lastName: "O’Perera",
    email: "CUSTOMER@example.com",
    phone: "077-123 4567",
    password: "SecurePassword123!",
    preferredLanguage: "EN",
  };
  it("normalizes local/international mobile formats and names", () => {
    expect(registrationSchema.parse(valid)).toMatchObject({
      firstName: "අමා",
      lastName: "O’Perera",
      email: "customer@example.com",
      phone: "+94771234567",
    });
    expect(normalizeMobile("+94 77-123-4567")).toBe("+94771234567");
    for (const name of ["தமிழ்", "අමර", "Anne-Marie", "A. Perera"])
      expect(personNameSchema.safeParse(name).success).toBe(true);
  });
  it("accepts omitted or blank email", () => {
    expect(registrationSchema.safeParse({ ...valid, email: "" }).success).toBe(
      true,
    );
    expect(
      registrationSchema.parse({ ...valid, email: undefined }).email,
    ).toBeNull();
  });
  it("requires mobile and both names", () => {
    for (const key of ["phone", "firstName", "lastName"] as const)
      expect(
        registrationSchema.safeParse({ ...valid, [key]: "" }).success,
      ).toBe(false);
    for (const phone of [
      "0111234567",
      "+94111234567",
      "077123456",
      "07712345678",
      "+9477.1234567",
    ])
      expect(normalizeMobile(phone)).toBeNull();
  });
  it("rejects public role selection and weak passwords", () => {
    expect(
      registrationSchema.safeParse({ ...valid, role: "ADMIN" }).success,
    ).toBe(false);
    expect(
      registrationSchema.safeParse({ ...valid, password: "weak" }).success,
    ).toBe(false);
  });
  it("accepts only mobile/password login", () => {
    expect(
      loginSchema.parse({ identifier: "0771234567", password: "test" })
        .identifier,
    ).toBe("+94771234567");
    expect(
      loginSchema.safeParse({
        identifier: "customer@example.com",
        password: "test",
      }).success,
    ).toBe(false);
    expect(
      loginSchema.safeParse({ identifier: "Same Name", password: "test" })
        .success,
    ).toBe(false);
  });
});

it.each(["Abcdefg1", "Abcdef1!", "LongerPassword123"])(
  "accepts password %s under the eight-character policy",
  (password) => {
    expect(passwordSchema.safeParse(password).success).toBe(true);
  },
);
it.each([
  "Abcdef1",
  "abcdefg1",
  "ABCDEFG1",
  "Abcdefgh",
  "A1" + "a".repeat(127),
])("rejects password missing a required rule: %s", (password) => {
  expect(passwordSchema.safeParse(password).success).toBe(false);
});
