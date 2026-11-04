import { describe, expect, it } from "vitest";
import { calculatePricing, validatePricing } from "@/lib/pricing";
import {
  productCreateSchema,
  productUpdateSchema,
} from "@/validations/product";
import { getCartSubtotal } from "@/features/cart/cart-state";
const tiers = [
  { minimumQuantity: 1, discountAmount: "5.00" },
  { minimumQuantity: 3, discountAmount: "7.00" },
  { minimumQuantity: 5, discountAmount: "10.00" },
];
const base = {
  shopId: "00000000-0000-4000-8000-000000000001",
  categoryId: "00000000-0000-4000-8000-000000000002",
  nameEn: "Rice",
  itemCode: "001",
  price: "100.00",
  stockQuantity: 100,
  sellingUnit: "UNIT",
};
describe("quantity discount pricing", () => {
  it.each([
    [1, "95.00", "95.00"],
    [2, "95.00", "190.00"],
    [3, "93.00", "279.00"],
    [4, "93.00", "372.00"],
    [5, "90.00", "450.00"],
    [6, "90.00", "540.00"],
    [10, "90.00", "900.00"],
  ])(
    "prices UNIT quantity %s as %s and %s",
    (quantity, unitPrice, lineTotal) => {
      expect(calculatePricing("100.00", Number(quantity), tiers)).toMatchObject(
        { unitPrice, lineTotal, regularPrice: "100.00" },
      );
    },
  );
  it.each([0.499, 0.5, 0.501, 0.999, 1, 1.001, 2.999, 3, 3.001])(
    "chooses the highest KG threshold at %s",
    (quantity) => {
      const kg = [
        { minimumQuantity: 0.5, discountAmount: "5.00" },
        { minimumQuantity: 1, discountAmount: "7.00" },
        { minimumQuantity: 3, discountAmount: "10.00" },
      ];
      const discount =
        quantity >= 3
          ? "10.00"
          : quantity >= 1
            ? "7.00"
            : quantity >= 0.5
              ? "5.00"
              : "0.00";
      expect(calculatePricing("100.00", quantity, kg).appliedDiscount).toBe(
        discount,
      );
    },
  );
  it("retains regular price without qualifying tiers and supports free/zero-discount tiers", () => {
    expect(
      calculatePricing("100.00", 1, [
        { minimumQuantity: 3, discountAmount: "7.00" },
      ]),
    ).toMatchObject({ unitPrice: "100.00", savings: "0.00" });
    expect(calculatePricing("100.00", 1, []).unitPrice).toBe("100.00");
    expect(
      calculatePricing("100.00", 3, [
        { minimumQuantity: 3, discountAmount: "100.00" },
      ]),
    ).toMatchObject({
      unitPrice: "0.00",
      lineTotal: "0.00",
      savings: "300.00",
    });
    expect(() =>
      validatePricing(
        "0.00",
        [{ minimumQuantity: 1, discountAmount: "0.00" }],
        {},
      ),
    ).not.toThrow();
  });
  it("rounds charged lines half up, and savings reconcile to rounded regular totals", () => {
    expect(
      calculatePricing("10.02", 0.5, [
        { minimumQuantity: 0.5, discountAmount: "0.01" },
      ]),
    ).toMatchObject({
      unitPrice: "10.01",
      lineTotal: "5.01",
      regularLineTotal: "5.01",
      savings: "0.00",
    });
    const product = {
      id: "one",
      name: "Rice",
      price: "0.02",
      stockQuantity: 2,
      imageUrl: null,
      sellingUnit: "KG" as const,
      discountTiers: [{ minimumQuantity: 0.5, discountAmount: "0.01" }],
      quantity: 0.5,
    };
    expect(
      getCartSubtotal({ items: [product, { ...product, id: "two" }] }),
    ).toBe("0.02");
  });
  it.each([
    Array.from({ length: 5 }, (_, i) => ({
      minimumQuantity: i + 1,
      discountAmount: "1.00",
    })),
    [{ minimumQuantity: 0, discountAmount: "1.00" }],
    [{ minimumQuantity: -1, discountAmount: "1.00" }],
    [{ minimumQuantity: 1.5, discountAmount: "1.00" }],
    [{ minimumQuantity: 1, discountAmount: "-1.00" }],
    [{ minimumQuantity: 1, discountAmount: "100.01" }],
    [{ minimumQuantity: 1, discountAmount: "1.001" }],
    [
      { minimumQuantity: 1, discountAmount: "5.00" },
      { minimumQuantity: 1, discountAmount: "6.00" },
    ],
    [
      { minimumQuantity: 3, discountAmount: "5.00" },
      { minimumQuantity: 1, discountAmount: "6.00" },
    ],
    [
      { minimumQuantity: 1, discountAmount: "7.00" },
      { minimumQuantity: 3, discountAmount: "5.00" },
    ],
  ])("rejects invalid tiers %j", (discountTiers) => {
    expect(
      productCreateSchema.safeParse({ ...base, discountTiers }).success,
    ).toBe(false);
  });
  it("checks UNIT increments, KG precision and minimum while preserving typed KG behavior", () => {
    expect(() =>
      validatePricing(
        "100.00",
        [{ minimumQuantity: 3, discountAmount: "1.00" }],
        { minimumOrderQuantity: 2, orderingIncrement: 2 },
      ),
    ).toThrow("quantity rules");
    expect(() =>
      validatePricing(
        "100.00",
        [{ minimumQuantity: 0.003, discountAmount: "1.00" }],
        {
          sellingUnit: "KG",
          minimumOrderQuantity: 0.002,
          orderingIncrement: 1,
        },
      ),
    ).not.toThrow();
    expect(() =>
      validatePricing(
        "100.00",
        [{ minimumQuantity: 0.001, discountAmount: "1.00" }],
        { sellingUnit: "KG", minimumOrderQuantity: 0.002 },
      ),
    ).toThrow();
    expect(() =>
      validatePricing(
        "100.00",
        [{ minimumQuantity: 0.5001, discountAmount: "1.00" }],
        { sellingUnit: "KG" },
      ),
    ).toThrow();
  });
  it("accepts explicitly removing tiers and validates complete submitted price edits", () => {
    const { shopId: _shop, ...fields } = base;
    void _shop;
    expect(
      productUpdateSchema.safeParse({ ...fields, discountTiers: [] }).success,
    ).toBe(true);
    expect(
      productUpdateSchema.safeParse({
        ...fields,
        price: "4.00",
        discountTiers: tiers,
      }).success,
    ).toBe(false);
    expect(
      productCreateSchema.parse({ ...base, discountTiers: tiers })
        .discountTiers,
    ).toEqual(tiers);
  });
});
