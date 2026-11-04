import { describe, expect, it } from "vitest";
import {
  quantityMilli,
  quantityValid,
  stepQuantity,
  firstOrderQuantity,
} from "@/lib/quantity";
import {
  moneyToMinorUnits,
  multiplyMinorUnits,
  minorUnitsToMoney,
} from "@/lib/money";
import { productCreateSchema } from "@/validations/product";
import {
  cartReducer,
  emptyCartState,
  getCartItemCount,
  getCartSubtotal,
} from "@/features/cart/cart-state";

const setup = {
  sellingUnit: "KG" as const,
  minimumOrderQuantity: 0.25,
  orderingIncrement: 0.125,
};
const product = {
  id: "rice",
  name: "Rice",
  price: "10.01",
  imageUrl: null,
  stockQuantity: 2.5,
  ...setup,
};
const input = {
  shopId: "00000000-0000-4000-8000-000000000001",
  categoryId: "00000000-0000-4000-8000-000000000002",
  itemCode: "00012",
  barcode: "00000045",
  nameEn: "Rice",
  price: "10.01",
  stockQuantity: "2.500",
  ...setup,
};

describe("stage 1 selling quantities", () => {
  it.each([0, -1, 0.124, 0.249, 0.2501, NaN, Infinity, 2147483648])(
    "rejects invalid KG quantity %s",
    (quantity) => expect(quantityValid(quantity, setup)).toBe(false),
  );
  it.each([0.25, 0.251, 0.375, 0.5, 2.5, 2147483647])(
    "accepts typed KG weights without increment restrictions %s",
    (quantity) => expect(quantityValid(quantity, setup)).toBe(true),
  );
  it("starts KG orders at the minimum without rounding to an increment", () => {
    const unaligned = {
      ...setup,
      minimumOrderQuantity: 0.3,
      orderingIncrement: 0.2,
    };
    expect(
      productCreateSchema.safeParse({ ...input, ...unaligned }).success,
    ).toBe(true);
    expect(firstOrderQuantity(unaligned)).toBe(0.3);
    expect(
      cartReducer(emptyCartState, {
        type: "add",
        product: { ...product, ...unaligned },
      }).items[0]?.quantity,
    ).toBe(0.3);
  });
  it("does not restrict typed KG weights to increment multiples", () => {
    expect(
      quantityValid(0.3, {
        ...setup,
        minimumOrderQuantity: 0.3,
        orderingIncrement: 0.2,
      }),
    ).toBe(true);
    expect(
      quantityValid(0.4, {
        ...setup,
        minimumOrderQuantity: 0.3,
        orderingIncrement: 0.2,
      }),
    ).toBe(true);
  });
  it("only permits whole UNIT quantities", () => {
    expect(quantityValid(0.5, {})).toBe(false);
    expect(quantityValid(1, {})).toBe(true);
    expect(
      quantityValid(3, { minimumOrderQuantity: 2, orderingIncrement: 2 }),
    ).toBe(false);
  });
  it("increments exactly without binary decimal drift", () => {
    expect(stepQuantity(0.1, 0.2)).toBe(0.3);
    expect(quantityMilli("2147483647.000")).toBe(BigInt("2147483647000"));
  });
  it.each([
    ["0.01", 0.5, "0.01"],
    ["10.01", 0.5, "5.01"],
    ["0.01", 0.499, "0.00"],
    ["9999999999.99", 0.001, "10000000.00"],
  ])("rounds %s × %s half up to %s", (price, quantity, expected) => {
    expect(
      minorUnitsToMoney(
        multiplyMinorUnits(moneyToMinorUnits(String(price)), Number(quantity)),
      ),
    ).toBe(expected);
  });
  it("sums rounded lines rather than rounding the final subtotal", () => {
    expect(
      getCartSubtotal({
        items: [
          { ...product, price: "0.01", quantity: 0.5 },
          { ...product, id: "other", price: "0.01", quantity: 0.5 },
        ],
      }),
    ).toBe("0.02");
  });
  it("preserves identifier zeros and normalizes empty barcodes", () => {
    expect(productCreateSchema.parse(input)).toMatchObject({
      itemCode: "00012",
      barcode: "00000045",
      stockQuantity: 2.5,
    });
    expect(
      productCreateSchema.parse({ ...input, barcode: "  " }).barcode,
    ).toBeNull();
    expect(
      productCreateSchema.safeParse({ ...input, itemCode: " " }).success,
    ).toBe(false);
    expect(
      productCreateSchema.safeParse({ ...input, itemCode: 12 }).success,
    ).toBe(false);
  });
  it("validates selling setup and UNIT stock boundaries", () => {
    for (const override of [
      { minimumOrderQuantity: 0 },
      { orderingIncrement: 0 },
      { stockQuantity: "1.0001" },
      { sellingUnit: "UNIT" },
      {
        sellingUnit: "UNIT",
        stockQuantity: 1,
        minimumOrderQuantity: 1,
        orderingIncrement: 1,
        lowStockThreshold: 0.5,
      },
    ]) {
      expect(
        productCreateSchema.safeParse({ ...input, ...override }).success,
      ).toBe(false);
    }
  });
  it("adds the minimum once, accepts typed weight, and counts a weight line as one product", () => {
    const added = cartReducer(emptyCartState, { type: "add", product });
    expect(added.items[0]?.quantity).toBe(0.25);
    expect(cartReducer(added, { type: "add", product })).toBe(added);
    const half = cartReducer(added, {
      type: "update",
      productId: product.id,
      quantity: 0.5,
    });
    expect(getCartItemCount(half)).toBe(1);
    expect(
      cartReducer(half, {
        type: "update",
        productId: product.id,
        quantity: 0.501,
      }).items[0]?.quantity,
    ).toBe(0.501);
  });
  it("automatically sets new-product rules for each selling unit", () => {
    expect(productCreateSchema.parse(input)).toMatchObject({
      minimumOrderQuantity: 0.002,
      orderingIncrement: 0.001,
    });
    expect(
      productCreateSchema.parse({
        ...input,
        sellingUnit: "UNIT",
        stockQuantity: 2,
        minimumOrderQuantity: 2,
        orderingIncrement: 2,
      }),
    ).toMatchObject({ minimumOrderQuantity: 1, orderingIncrement: 1 });
  });
  it("enforces the 0.002 kg floor and three-decimal precision", () => {
    const weightSetup = {
      sellingUnit: "KG" as const,
      minimumOrderQuantity: 0.002,
      orderingIncrement: 1,
    };
    expect(quantityValid(0.001, weightSetup)).toBe(false);
    expect(quantityValid(0.002, weightSetup)).toBe(true);
    expect(quantityValid(0.003, weightSetup)).toBe(true);
    expect(quantityValid(0.0021, weightSetup)).toBe(false);
    expect(firstOrderQuantity(weightSetup)).toBe(0.002);
  });
  it("preserves legacy quantities without converting UNIT into KG", () => {
    const legacy = {
      id: "rice",
      name: "Rice",
      price: "10.00",
      stockQuantity: 5,
      imageUrl: null,
      quantity: 3,
    };
    const hydrated = cartReducer(emptyCartState, {
      type: "hydrate",
      items: [legacy],
    });
    expect(hydrated.items[0]?.quantity).toBe(3);
    expect(cartReducer(hydrated, { type: "add", product })).toBe(hydrated);
  });
});
