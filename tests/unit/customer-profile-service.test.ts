import { describe, expect, it, vi } from "vitest";
import {
  PreferredLanguage,
  UserRole,
  UserStatus,
} from "@/generated/prisma/client";
import type { CustomerProfileRepository } from "@/repositories/customer-profile.repository";
import { updateCustomerProfile } from "@/services/customer-profile.service";
import type { AuthenticatedUser } from "@/types/auth";
import { profileUpdateSchema } from "@/validations/profile";

const administrator: AuthenticatedUser = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Test Administrator",
  firstName: "Test",
  lastName: "Administrator",
  email: "admin@example.test",
  phone: "+94770000000",
  role: UserRole.ADMIN,
  preferredLanguage: PreferredLanguage.EN,
  status: UserStatus.ACTIVE,
};

describe("shared profile service", () => {
  it("allows an administrator to update only self-profile identity fields", async () => {
    const repository = {
      updateCustomer: vi.fn().mockResolvedValue(administrator),
    } as unknown as CustomerProfileRepository;
    await updateCustomerProfile(
      administrator,
      {
        firstName: "Test",
        lastName: "Administrator",
        phone: "+94770000000",
        email: null,
        preferredLanguage: "SI",
      },
      repository,
    );
    expect(repository.updateCustomer).toHaveBeenCalledWith(
      administrator.id,
      expect.objectContaining({ email: null }),
    );
    expect(
      profileUpdateSchema.safeParse({
        firstName: "Test",
        lastName: "Administrator",
        phone: "+94770000000",
        email: "",
        preferredLanguage: "EN",
        role: "ADMIN",
      }).success,
    ).toBe(false);
  });
});
