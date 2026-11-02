import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CartQuantityInput } from "@/features/cart/components/cart-quantity-input";

afterEach(cleanup);
it("allows typing a KG decimal and commits only a valid minimum, precision and stock on blur", () => {
  const onChange = vi.fn(() => true);
  const item = {
    id: "rice",
    name: "Rice",
    price: "10.00",
    imageUrl: null,
    quantity: 0.25,
    stockQuantity: 2.5,
    sellingUnit: "KG" as const,
    minimumOrderQuantity: 0.25,
    orderingIncrement: 0.125,
  };
  render(
    <CartQuantityInput item={item} label="Rice quantity" onChange={onChange} />,
  );
  const field = screen.getByLabelText("Rice quantity");
  fireEvent.change(field, { target: { value: "0" } });
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.change(field, { target: { value: "0.375" } });
  fireEvent.blur(field);
  expect(onChange).toHaveBeenCalledWith("rice", 0.375);
  onChange.mockClear();
  fireEvent.change(field, { target: { value: "0.3761" } });
  fireEvent.blur(field);
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toBeInTheDocument();
});

it("uses one-at-a-time buttons for unit products", () => {
  const onChange = vi.fn(() => true);
  const item = {
    id: "tea",
    name: "Tea",
    price: "10.00",
    imageUrl: null,
    quantity: 2,
    stockQuantity: 3,
    sellingUnit: "UNIT" as const,
    minimumOrderQuantity: 1,
    orderingIncrement: 1,
  };
  render(
    <CartQuantityInput item={item} label="Tea quantity" onChange={onChange} />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Reduce quantity of Tea" }),
  );
  expect(onChange).toHaveBeenLastCalledWith("tea", 1);
  fireEvent.click(
    screen.getByRole("button", { name: "Increase quantity of Tea" }),
  );
  expect(onChange).toHaveBeenLastCalledWith("tea", 3);
  expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
});
