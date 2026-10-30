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
