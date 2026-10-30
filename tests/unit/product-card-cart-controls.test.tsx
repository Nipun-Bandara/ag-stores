import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
import { cartStore } from "@/features/cart/cart-store";

beforeEach(() => cartStore.clear());
afterEach(cleanup);

it("adds up to available stock and removes the item when reduced to zero", () => {
  render(
    <TooltipProvider>
      <AddToCartButton
        compact
        product={{
          id: "test-product",
          name: "Tea",
          price: "100.00",
          stockQuantity: 2,
          imageUrl: null,
        }}
      />
    </TooltipProvider>,
  );

  const add = screen.getByRole("button", { name: "Add Tea to cart" });
  const reduce = screen.getByRole("button", {
    name: "Remove one Tea from cart",
  });
  expect(reduce).toBeDisabled();
  fireEvent.click(add);
  expect(screen.getByText("1", { exact: true })).toBeVisible();
  fireEvent.click(add);
  expect(add).toBeDisabled();
  expect(screen.getByText("2", { exact: true })).toBeVisible();
  fireEvent.click(reduce);
  expect(add).toBeEnabled();
  fireEvent.click(reduce);
  expect(screen.getByText("0", { exact: true })).toBeVisible();
  expect(reduce).toBeDisabled();
});
