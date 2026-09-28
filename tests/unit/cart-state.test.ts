import { describe, expect, it } from "vitest";

import {
  cartReducer,
  emptyCartState,
  getCartSubtotal,
  type CartProduct,
} from "@/features/cart/cart-state";

const product: CartProduct = {
  id: "44f5bfe2-22ca-46a3-943b-3b01ed7cf1c2",
  name: "Red Rice",
  price: "420.00",
  stockQuantity: 3,
  imageUrl: null,
};

describe("cart state", () => {
  it("adds a product and increments it when added twice", () => {
    const once = cartReducer(emptyCartState, { type: "add", product });
    const twice = cartReducer(once, { type: "add", product });

    expect(once.items).toEqual([{ ...product, quantity: 1 }]);
    expect(twice.items[0]?.quantity).toBe(2);
  });

  it("updates quantity without exceeding current stock", () => {
    const added = cartReducer(emptyCartState, { type: "add", product });
    const updated = cartReducer(added, {
      type: "update",
      productId: product.id,
      quantity: 3,
    });
    const rejected = cartReducer(updated, {
      type: "update",
      productId: product.id,
      quantity: 4,
    });

    expect(updated.items[0]?.quantity).toBe(3);
    expect(rejected).toBe(updated);
  });

  it("rejects zero-stock products", () => {
    const result = cartReducer(emptyCartState, {
      type: "add",
      product: { ...product, stockQuantity: 0 },
    });
    expect(result).toBe(emptyCartState);
  });

  it("removes individual items and clears the cart", () => {
    const added = cartReducer(emptyCartState, { type: "add", product });
    expect(
      cartReducer(added, { type: "remove", productId: product.id }).items,
    ).toEqual([]);
    expect(cartReducer(added, { type: "clear" }).items).toEqual([]);
  });

  it("calculates a decimal-safe subtotal", () => {
    const state = cartReducer(
      cartReducer(emptyCartState, { type: "add", product }),
      { type: "add", product },
    );
    expect(getCartSubtotal(state)).toBe("840.00");

    const smallPrices = {
      items: [
        { ...product, id: "one", price: "0.10", quantity: 1 },
        { ...product, id: "two", price: "0.20", quantity: 1 },
      ],
    };
    expect(getCartSubtotal(smallPrices)).toBe("0.30");
  });
});
