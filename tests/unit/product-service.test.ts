import { describe, expect, it, vi } from "vitest";

import {
  PreferredLanguage,
  UserRole,
  UserStatus,
} from "@/generated/prisma/client";
import type { ProductRepository } from "@/repositories/product.repository";
import {
  createProduct,
  ProductError,
  updateProduct,
} from "@/services/product.service";
import type { AuthenticatedUser } from "@/types/auth";

function repository(): ProductRepository {
  return {
    findOwnerShops: vi.fn(),
    findOwnerCategories: vi.fn(),
    ownerHasCategory: vi.fn(),
    findManyOwned: vi.fn(),
    findOwnedById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setAvailabilityOwned: vi.fn(),
    updateStockOwned: vi.fn(),
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

const owner = { ...customer, role: UserRole.SHOP_OWNER };

const productInput = {
  shopId: "00000000-0000-4000-8000-000000000002",
  categoryId: "00000000-0000-4000-8000-000000000003",
  nameEn: "Product",
  nameSi: null,
  descriptionEn: null,
  descriptionSi: null,
  price: "10.00",
  stockQuantity: 1,
  imageUrl: null,
  isAvailable: true,
};

describe("product service authorization", () => {
  it("rejects customer product creation before persistence", async () => {
    const fake = repository();

    await expect(
      createProduct(customer, productInput, fake),
    ).rejects.toMatchObject({
      code: "OWNER_ONLY",
      status: 403,
    } satisfies Partial<ProductError>);
    expect(fake.create).not.toHaveBeenCalled();
  });

  it("does not update a product outside the owner's shops", async () => {
    const fake = repository();
    vi.mocked(fake.findOwnedById).mockResolvedValue(null);

    await expect(
      updateProduct(
        owner,
        "00000000-0000-4000-8000-000000000004",
        productInput,
        fake,
      ),
    ).rejects.toMatchObject({
      code: "PRODUCT_NOT_FOUND",
      status: 404,
    } satisfies Partial<ProductError>);
    expect(fake.update).not.toHaveBeenCalled();
  });
});
