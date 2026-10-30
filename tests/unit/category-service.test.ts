import { describe, expect, it, vi } from "vitest";

import {
  PreferredLanguage,
  UserRole,
  UserStatus,
} from "@/generated/prisma/client";
import type { CategoryRepository } from "@/repositories/category.repository";
import {
  CategoryError,
  createCategory,
  updateCategory,
} from "@/services/category.service";
import type { AuthenticatedUser } from "@/types/auth";

function repository(): CategoryRepository {
  return {
    findOwnerShops: vi.fn(),
    ownerHasShop: vi.fn(),
    findByOwner: vi.fn(),
    findByShop: vi.fn(),
    create: vi.fn(),
    updateOwned: vi.fn(),
    setStatusOwned: vi.fn(),
  };
}

const customer: AuthenticatedUser = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Customer",
  email: "customer@example.test",
  phone: null,
  role: UserRole.CUSTOMER,
  preferredLanguage: PreferredLanguage.EN,
  status: UserStatus.ACTIVE,
};

const owner: AuthenticatedUser = {
  ...customer,
  id: "00000000-0000-4000-8000-000000000002",
  role: UserRole.SHOP_OWNER,
};

describe("category service authorization", () => {
  it("rejects non-owner category creation before persistence", async () => {
    const fake = repository();

    await expect(
      createCategory(
        customer,
        {
          shopId: "00000000-0000-4000-8000-000000000003",
          nameEn: "Fresh",
          nameSi: null,
        },
        fake,
      ),
    ).rejects.toMatchObject({
      code: "OWNER_ONLY",
      status: 403,
    } satisfies Partial<CategoryError>);
    expect(fake.create).not.toHaveBeenCalled();
  });

  it("returns not found when an owner updates an unowned category", async () => {
    const fake = repository();
    vi.mocked(fake.updateOwned).mockResolvedValue(null);

    await expect(
      updateCategory(
        owner,
        "00000000-0000-4000-8000-000000000004",
        { nameEn: "Changed", nameSi: null },
        fake,
      ),
    ).rejects.toMatchObject({
      code: "CATEGORY_NOT_FOUND",
      status: 404,
    } satisfies Partial<CategoryError>);
  });
});
