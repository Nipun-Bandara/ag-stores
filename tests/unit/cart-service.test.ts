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
    nameSi: null,
    discountTiers: [],
    price: new Prisma.Decimal("475.25"),
    stockQuantity: new Prisma.Decimal(5),
    sellingUnit: "UNIT",
    minimumOrderQuantity: new Prisma.Decimal(1),
    orderingIncrement: new Prisma.Decimal(1),
    isAvailable: true,
    category: { status: CatalogStatus.ACTIVE },
    shop: {
      id: "a4f5bfe2-22ca-46a3-943b-3b01ed7cf1c2",
      deliveryFee: new Prisma.Decimal("250.00"),
    },
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
    product({ stockQuantity: new Prisma.Decimal(0) }),
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

it("quotes typed KG weights without applying the old increment multiple", async () => {
  const record = product({
    sellingUnit: "KG",
    minimumOrderQuantity: new Prisma.Decimal("0.002"),
    orderingIncrement: new Prisma.Decimal("0.125"),
  });
  const result = await validateCartForCheckout(
    { items: [{ productId, quantity: 0.003, sellingUnit: "KG" }] },
    repository(record),
  );
  expect(result.items[0]?.quantity).toBe(0.003);
  expect(result.subtotal).toBe("1.43");
});

it.each([0.001, 0.0021])(
  "rejects invalid KG weight %s during server cart validation",
  async (quantity) => {
    const record = product({
      sellingUnit: "KG",
      minimumOrderQuantity: new Prisma.Decimal("0.002"),
      orderingIncrement: new Prisma.Decimal("0.001"),
    });
    await expect(
      validateCartForCheckout(
        { items: [{ productId, quantity, sellingUnit: "KG" }] },
        repository(record),
      ),
    ).rejects.toMatchObject({ code: "INVALID_QUANTITY" });
  },
);
