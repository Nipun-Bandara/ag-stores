import { describe, expect, it, vi } from "vitest";

import {
  PreferredLanguage,
  UserRole,
  UserStatus,
} from "@/generated/prisma/client";
import type { CustomerProfileRepository } from "@/repositories/customer-profile.repository";
import {
  CustomerProfileError,
  updateCustomerProfile,
} from "@/services/customer-profile.service";
import type { AuthenticatedUser } from "@/types/auth";

function createRepository(): CustomerProfileRepository {
  return {
    findCustomerById: vi.fn(),
    updateCustomer: vi.fn(),
    findPasswordRecord: vi.fn(),
    updatePasswordAndRevokeOtherSessions: vi.fn(),
  };
}

const administrator: AuthenticatedUser = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Administrator",
  email: "admin@example.test",
  phone: null,
  role: UserRole.ADMIN,
  preferredLanguage: PreferredLanguage.EN,
  status: UserStatus.ACTIVE,
};

describe("customer profile service", () => {
  it("rejects unauthorized profile updates before persistence", async () => {
    const repository = createRepository();

    await expect(
      updateCustomerProfile(
        administrator,
        {
          name: "Role Escalation",
          phone: "+94771234567",
          preferredLanguage: "EN",
        },
        repository,
      ),
    ).rejects.toMatchObject({
      code: "CUSTOMER_ONLY",
      status: 403,
    } satisfies Partial<CustomerProfileError>);
    expect(repository.updateCustomer).not.toHaveBeenCalled();
  });
});
