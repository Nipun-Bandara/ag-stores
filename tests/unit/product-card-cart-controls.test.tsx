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

it("converts between grams and kilograms without changing the selected weight or its discounted price", async () => {
  const { CataloguePricing } =
    await import("@/features/pricing/catalogue-pricing");
  const product = {
    id: "weighted-rice",
    name: "Rice",
    price: "100.00",
    sellingUnit: "KG" as const,
    minimumOrderQuantity: 0.002,
    orderingIncrement: 0.001,
    stockQuantity: 2,
    imageUrl: null,
    discountTiers: [{ minimumQuantity: 0.25, discountAmount: "10.00" }],
  };
  render(
    <TooltipProvider>
      <AddToCartButton compact product={product} />
      <CataloguePricing product={product} locale="en" />
    </TooltipProvider>,
  );
  const selectUnit = async (label: string) => {
    fireEvent.click(
      screen.getByRole("combobox", { name: "Weight unit for Rice" }),
    );
    const option = await screen.findByRole("option", {
      name: label,
    });
    fireEvent.pointerDown(option, { pointerType: "mouse" });
    fireEvent.click(option);
  };
  await selectUnit("g");
  const grams = screen.getByRole("spinbutton", {
    name: "Weight in g for Rice",
  });
  expect(grams).toHaveAttribute("min", "2");
  expect(grams).toHaveAttribute("max", "2000");
  expect(grams).toHaveAttribute("step", "1");
  for (const amount of ["1", "2.5", "2001"]) {
    fireEvent.change(grams, { target: { value: amount } });
    fireEvent.click(screen.getByRole("button", { name: "Add Rice to cart" }));
    expect(screen.getByRole("alert")).toBeVisible();
  }
  fireEvent.change(grams, { target: { value: "250" } });
  fireEvent.click(screen.getByRole("button", { name: "Add Rice to cart" }));
  expect(
    screen.getByRole("spinbutton", { name: "Weight in g for Rice" }),
  ).toHaveValue(250);
  expect(screen.getByText(/Our price.*90.00/)).toBeVisible();
  expect(screen.getByText(/Line total.*22.50/)).toBeVisible();
  expect(
    screen.getByRole("combobox", { name: "Weight unit for Rice" }),
  ).toHaveTextContent("g");
  await selectUnit("kg");
  expect(
    screen.getByRole("spinbutton", { name: "Weight in kg for Rice" }),
  ).toHaveValue(0.25);
  expect(screen.getByText(/Line total.*22.50/)).toBeVisible();
});
