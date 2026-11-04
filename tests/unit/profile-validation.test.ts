import { describe, expect, it } from "vitest";

import {
  passwordChangeSchema,
  profileUpdateSchema,
} from "@/validations/profile";

describe("profile validation", () => {
  const validProfile = {
    firstName: "Updated",
    lastName: "Customer",
    email: "",
    phone: "+94771234567",
    preferredLanguage: "SI",
  };

  it("accepts valid editable profile fields", () => {
    expect(profileUpdateSchema.parse(validProfile)).toEqual({
      ...validProfile,
      email: null,
    });
  });

  it("rejects invalid phone numbers", () => {
    expect(
      profileUpdateSchema.safeParse({ ...validProfile, phone: "0111234567" })
        .success,
    ).toBe(false);
  });

  it("rejects role, status, shop assignment and user ID fields", () => {
    for (const forbiddenField of [
      "role",
      "status",
      "assignedShopId",
      "userId",
    ] as const) {
      expect(
        profileUpdateSchema.safeParse({
          ...validProfile,
          [forbiddenField]: "not-allowed",
        }).success,
      ).toBe(false);
    }
  });
});

describe("password change validation", () => {
  it("requires matching, strong, different passwords", () => {
    expect(
      passwordChangeSchema.safeParse({
        currentPassword: "CurrentPassword123!",
        newPassword: "NewSecurePassword123!",
        confirmPassword: "NewSecurePassword123!",
      }).success,
    ).toBe(true);

    expect(
      passwordChangeSchema.safeParse({
        currentPassword: "CurrentPassword123!",
        newPassword: "NewSecurePassword123!",
        confirmPassword: "DifferentPassword123!",
      }).success,
    ).toBe(false);
  });
});
