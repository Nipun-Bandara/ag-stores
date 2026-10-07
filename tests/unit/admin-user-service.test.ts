import { describe, expect, it, vi } from "vitest";

import {
  PreferredLanguage,
  UserRole,
  UserStatus,
} from "@/generated/prisma/client";
import type { AdminUserRepository } from "@/repositories/admin-user.repository";
import {
  AdminUserError,
  listAdminUsers,
  setAdminUserStatus,
} from "@/services/admin-user.service";
import type { AuthenticatedUser } from "@/types/auth";

const admin: AuthenticatedUser = {
  id: "admin-id",
  name: "Administrator",
  email: "admin@example.test",
  phone: null,
  role: UserRole.ADMIN,
  preferredLanguage: PreferredLanguage.EN,
  status: UserStatus.ACTIVE,
};

function mockRepository(): AdminUserRepository {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    setStatus: vi.fn().mockResolvedValue({ kind: "not_found" }),
  };
}

describe("admin user service", () => {
  it("forwards validated search, role, and status filters", async () => {
    const repository = mockRepository();
    const filters = {
      search: "sample",
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
    };

    await expect(listAdminUsers(admin, filters, repository)).resolves.toEqual(
      [],
    );
    expect(repository.findMany).toHaveBeenCalledWith(filters);
  });

  it("rejects every non-admin role before querying users", async () => {
    for (const role of [
      UserRole.CUSTOMER,
      UserRole.SHOP_OWNER,
      UserRole.DELIVERY_PERSON,
    ]) {
      const repository = mockRepository();
      await expect(
        listAdminUsers({ ...admin, role }, {}, repository),
      ).rejects.toMatchObject<Partial<AdminUserError>>({
        code: "ADMIN_ONLY",
        status: 403,
      });
      expect(repository.findMany).not.toHaveBeenCalled();
    }
  });

  it("surfaces the final-active-admin safeguard as a conflict", async () => {
    const repository = mockRepository();
    vi.mocked(repository.setStatus).mockResolvedValue({
      kind: "final_active_admin",
    });

    await expect(
      setAdminUserStatus(
        admin,
        admin.id,
        { status: UserStatus.INACTIVE },
        repository,
      ),
    ).rejects.toMatchObject<Partial<AdminUserError>>({
      code: "FINAL_ACTIVE_ADMIN",
      status: 409,
    });
  });
});
