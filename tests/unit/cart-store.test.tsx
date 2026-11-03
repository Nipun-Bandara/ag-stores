import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import { cartStore, useCart } from "@/features/cart/cart-store";

afterEach(() => {
  cartStore.setOwner(null);
  localStorage.clear();
  cleanup();
});

it("keeps each customer's saved cart separate across sign-ins", () => {
  const product = {
    id: "tea",
    name: "Tea",
    price: "100.00",
    stockQuantity: 5,
    imageUrl: null,
  };
  localStorage.setItem(
    "ag-stores-cart-v1",
    JSON.stringify({ items: [product] }),
  );
  const { result } = renderHook(() => useCart());

  act(() => cartStore.setOwner("customer-a"));
  act(() => {
    cartStore.add(product);
  });
  expect(result.current.items).toHaveLength(1);
  expect(localStorage.getItem("ag-stores-cart-v1")).toBeNull();

  act(() => cartStore.setOwner("customer-b"));
  expect(result.current.items).toEqual([]);
  act(() => cartStore.setOwner("customer-a"));
  expect(result.current.items).toHaveLength(1);

  act(() => cartStore.setOwner(null));
  expect(result.current.items).toEqual([]);
});

it("refreshes persisted pricing without changing selected quantities and rejects stale selection quotes", () => {
  const product = {
    id: "rice",
    name: "Rice",
    price: "999.00",
    stockQuantity: 10,
    imageUrl: null,
  };
  act(() => {
    cartStore.setOwner("pricing-customer");
    cartStore.add(product);
    cartStore.updateQuantity("rice", 3);
  });
  const { result } = renderHook(() => useCart());
  const key = JSON.stringify([
    { productId: "rice", quantity: 3, sellingUnit: "UNIT" },
  ]);
  const quote = {
    items: [
      {
        productId: "rice",
        name: "Rice",
        nameSi: null,
        quantity: 3,
        sellingUnit: "UNIT" as const,
        regularPrice: "100.00",
        appliedDiscount: "7.00",
        unitPrice: "93.00",
        lineTotal: "279.00",
        regularLineTotal: "300.00",
        savings: "21.00",
        stockQuantity: 10,
        minimumOrderQuantity: 1,
        orderingIncrement: 1,
        discountTiers: [{ minimumQuantity: 3, discountAmount: "7.00" }],
      },
    ],
    subtotal: "279.00",
    deliveryFee: "0.00",
  };
  act(() => {
    cartStore.updateFromQuote(key, quote);
  });
  expect(result.current.items[0]).toMatchObject({
    quantity: 3,
    price: "100.00",
  });
  expect(result.current.subtotal).toBe("279.00");
  act(() => {
    cartStore.updateQuantity("rice", 4);
  });
  expect(cartStore.updateFromQuote(key, quote)).toBe(false);
  expect(result.current.items[0]?.quantity).toBe(4);
});
