import { describe, expect, it, vi } from "vitest";

import type { AuthRepository } from "@/repositories/auth.repository";
import { AuthServiceError, registerCustomer } from "@/services/auth.service";

function createRepository(): AuthRepository {
  return {
    findDuplicate: vi.fn().mockResolvedValue(false),
    createCustomerWithSession: vi.fn(),
    findLoginUser: vi.fn(),
    createSession: vi.fn(),
    findActiveSessionUser: vi.fn(),
    deleteSession: vi.fn(),
  };
}

describe("registration service", () => {
  it("rejects duplicate registrations before hashing or creating a user", async () => {
    const repository = createRepository();
    vi.mocked(repository.findDuplicate).mockResolvedValue(true);

    await expect(
      registerCustomer(
        {
          name: "Duplicate Customer",
          email: "customer@example.com",
          phone: undefined,
          password: "SecurePassword123!",
          preferredLanguage: "EN",
        },
        repository,
      ),
    ).rejects.toMatchObject({
      code: "DUPLICATE_ACCOUNT",
      status: 409,
    } satisfies Partial<AuthServiceError>);
    expect(repository.createCustomerWithSession).not.toHaveBeenCalled();
  });
});
