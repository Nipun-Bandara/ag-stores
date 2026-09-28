import { describe, expect, it } from "vitest";

import { CatalogStatus, Prisma } from "@/generated/prisma/client";
import type {
  CartProductRecord,
  CartRepository,
} from "@/repositories/cart.repository";
import { validateCartForCheckout } from "@/services/cart.service";

const productId = "44f5bfe2-22ca-46a3-943b-3b01ed7cf1c2";

function product(
  overrides: Partial<CartProductRecord> = {},
): CartProductRecord {
  return {
    id: productId,
    nameEn: "Red Rice",
    price: new Prisma.Decimal("475.25"),
    stockQuantity: 5,
    isAvailable: true,
    category: { status: CatalogStatus.ACTIVE },
    ...overrides,
  };
}

function repository(record: CartProductRecord | null): CartRepository {
  return {
    async findProductsByIds() {
      return record ? [record] : [];
    },
  };
}

describe("checkout cart validation", () => {
  it("uses the current database price as authoritative", async () => {
    const result = await validateCartForCheckout(
      { items: [{ productId, quantity: 2 }] },
      repository(product()),
    );

    expect(result.items[0]).toMatchObject({
      unitPrice: "475.25",
      lineTotal: "950.50",
    });
    expect(result.subtotal).toBe("950.50");
  });

  it("rejects quantities greater than current stock", async () => {
    await expect(
      validateCartForCheckout(
        { items: [{ productId, quantity: 6 }] },
        repository(product()),
      ),
    ).rejects.toMatchObject({
      code: "INSUFFICIENT_STOCK",
    });
  });

  it.each([
    product({ isAvailable: false }),
    product({ stockQuantity: 0 }),
    product({ category: { status: CatalogStatus.INACTIVE } }),
    null,
  ])("rejects unavailable, zero-stock, or missing products", async (record) => {
    await expect(
      validateCartForCheckout(
        { items: [{ productId, quantity: 1 }] },
        repository(record),
      ),
    ).rejects.toMatchObject({
      code: "PRODUCT_UNAVAILABLE",
    });
  });
});
