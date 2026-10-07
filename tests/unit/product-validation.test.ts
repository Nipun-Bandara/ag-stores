import { describe, expect, it } from "vitest";

import { productCreateSchema, productStockSchema } from "@/validations/product";

const validProduct = {
  shopId: "00000000-0000-4000-8000-000000000001",
  categoryId: "00000000-0000-4000-8000-000000000002",
  nameEn: "Tea",
  nameSi: "තේ",
  descriptionEn: "Ceylon tea",
  descriptionSi: "ලංකා තේ",
  price: "125.5",
  stockQuantity: "10",
  imageUrl: "https://example.test/tea.jpg",
};

describe("product validation", () => {
  it("normalizes money without converting it through floating point", () => {
    expect(productCreateSchema.parse(validProduct)).toMatchObject({
      price: "125.50",
      stockQuantity: 10,
      lowStockThreshold: 5,
      isAvailable: true,
    });
    expect(
      productCreateSchema.parse({ ...validProduct, price: "9999999999.99" })
        .price,
    ).toBe("9999999999.99");
  });

  it.each(["-0.01", "1.001", "10000000000.00", "not-money"])(
    "rejects invalid price %s",
    (price) => {
      expect(
        productCreateSchema.safeParse({ ...validProduct, price }).success,
      ).toBe(false);
    },
  );

  it("rejects negative and fractional stock", () => {
    expect(productStockSchema.safeParse({ stockQuantity: -1 }).success).toBe(
      false,
    );
    expect(productStockSchema.safeParse({ stockQuantity: 1.5 }).success).toBe(
      false,
    );
    expect(
      productStockSchema.safeParse({
        stockQuantity: 1,
        lowStockThreshold: -1,
      }).success,
    ).toBe(false);
  });
});
