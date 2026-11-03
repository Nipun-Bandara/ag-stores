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
    name: "Reduce quantity of Tea",
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

it("lets customers type weights and rejects too little, excess precision, and excess stock", () => {
  render(
    <TooltipProvider>
      <AddToCartButton
        compact
        product={{
          id: "rice",
          name: "Rice",
          price: "100.00",
          sellingUnit: "KG",
          minimumOrderQuantity: 0.002,
          orderingIncrement: 0.001,
          stockQuantity: 2,
          imageUrl: null,
        }}
      />
    </TooltipProvider>,
  );
  const input = screen.getByRole("spinbutton", {
    name: "Weight in kg for Rice",
  });
  for (const weight of ["0.001", "0.0021", "2.001"]) {
    fireEvent.change(input, { target: { value: weight } });
    fireEvent.click(screen.getByRole("button", { name: "Add Rice to cart" }));
    expect(screen.getByRole("alert")).toBeVisible();
  }
  fireEvent.change(input, { target: { value: "0.003" } });
  fireEvent.click(screen.getByRole("button", { name: "Add Rice to cart" }));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("spinbutton")).toHaveValue(0.003);
  fireEvent.change(screen.getByRole("spinbutton"), {
    target: { value: "0.502" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Update weight for Rice" }),
  );
  expect(screen.getByRole("spinbutton")).toHaveValue(0.502);
  fireEvent.click(screen.getByRole("button", { name: "Remove Rice" }));
  expect(screen.getByRole("spinbutton")).toHaveValue(null);
  expect(
    screen.getByRole("button", { name: "Add Rice to cart" }),
  ).toBeEnabled();
  expect(
    screen.queryByRole("button", { name: "Reduce quantity of Rice" }),
  ).not.toBeInTheDocument();
});
