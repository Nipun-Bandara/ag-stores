import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CartView } from "@/features/cart/components/cart-view";
import { cartStore } from "@/features/cart/cart-store";
import { TooltipProvider } from "@/components/ui/tooltip";
import { calculatePricing } from "@/lib/pricing";
import type { CartQuote } from "@/services/cart.service";

const product = {
  id: "tea",
  name: "Tea",
  price: "999.00",
  stockQuantity: 10,
  imageUrl: null,
};
afterEach(() => {
  cleanup();
  cartStore.clear();
  cartStore.setOwner(null);
  vi.unstubAllGlobals();
});
it("shows initial skeletons, then recalculates edits and removals without fetching again or on focus", async () => {
  cartStore.add(product);
  cartStore.add({ ...product, id: "coffee", name: "Coffee" });
  let resolve: (response: unknown) => void = () => {};
  const fetch = vi.fn().mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  vi.stubGlobal("fetch", fetch);
  render(
    <TooltipProvider>
      <CartView />
    </TooltipProvider>,
  );
  expect(screen.getByRole("region", { name: "Cart items" })).toHaveAttribute(
    "aria-busy",
    "true",
  );
  expect(screen.queryByTestId("cart-item")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Summary" })).toBeVisible();
  const tiers = [{ minimumQuantity: 2, discountAmount: "10.00" }];
  const quote: CartQuote = {
    deliveryFee: "0.00",
    subtotal: "200.00",
    items: ["tea", "coffee"].map((id) => ({
      productId: id,
      name: id === "tea" ? "Tea" : "Coffee",
      nameSi: null,
      sellingUnit: "UNIT",
      quantity: 1,
      minimumOrderQuantity: 1,
      orderingIncrement: 1,
      stockQuantity: 10,
      discountTiers: tiers,
      ...calculatePricing("100.00", 1, tiers),
    })),
  };
  await act(async () =>
    resolve({ ok: true, json: async () => ({ data: quote }) }),
  );
  await waitFor(() =>
    expect(screen.getByTestId("cart-subtotal")).toHaveTextContent("200.00"),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Increase quantity of Tea" }),
  );
  expect(screen.getByTestId("cart-subtotal")).toHaveTextContent("280.00");
  expect(screen.getByText(/Our price.*90.00/)).toBeVisible();
  expect(screen.getByRole("region", { name: "Cart items" })).toHaveAttribute(
    "aria-busy",
    "false",
  );
  fireEvent.click(screen.getByRole("button", { name: "Remove Coffee" }));
  expect(screen.getByTestId("cart-subtotal")).toHaveTextContent("180.00");
  fireEvent(window, new Event("focus"));
  await act(async () => {});
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetch.mock.calls[0]![1].body)).toEqual({
    items: [
      { productId: "tea", quantity: 1, sellingUnit: "UNIT" },
      { productId: "coffee", quantity: 1, sellingUnit: "UNIT" },
    ],
  });
});

it("edits grams as canonical kilograms and retains the selected unit after saving", async () => {
  const tiers = [{ minimumQuantity: 0.5, discountAmount: "10.00" }];
  cartStore.add({
    ...product,
    id: "rice",
    name: "Rice",
    sellingUnit: "KG",
    minimumOrderQuantity: 0.002,
    orderingIncrement: 0.001,
    stockQuantity: 2,
  });
  cartStore.updateQuantity("rice", 0.25);
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      data: {
        deliveryFee: "0.00",
        subtotal: "25.00",
        items: [
          {
            productId: "rice",
            name: "Rice",
            nameSi: null,
            sellingUnit: "KG",
            quantity: 0.25,
            stockQuantity: 2,
            minimumOrderQuantity: 0.002,
            orderingIncrement: 0.001,
            discountTiers: tiers,
            ...calculatePricing("100.00", 0.25, tiers),
          },
        ],
      },
    }),
  });
  vi.stubGlobal("fetch", fetch);
  render(
    <TooltipProvider>
      <CartView />
    </TooltipProvider>,
  );
  const input = await screen.findByRole("spinbutton", {
    name: "Quantity for Rice",
  });
  const choose = async (unit: string) => {
    fireEvent.click(
      screen.getByRole("combobox", { name: "Weight unit for Rice" }),
    );
    const option = await screen.findByRole("option", { name: unit });
    fireEvent.pointerDown(option, { pointerType: "mouse" });
    fireEvent.click(option);
  };
  await choose("g");
  expect(input).toHaveValue(250);
  expect(input).toHaveAttribute("min", "2");
  expect(input).toHaveAttribute("max", "2000");
  for (const invalid of ["1", "2.5", "2001"]) {
    fireEvent.change(input, { target: { value: invalid } });
    fireEvent.blur(input);
    expect(screen.getByRole("alert")).toBeVisible();
    expect(screen.getByTestId("cart-subtotal")).toHaveTextContent("25.00");
  }
  fireEvent.change(input, { target: { value: "500" } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(input).toHaveValue(500);
  expect(screen.getByRole("combobox")).toHaveTextContent("g");
  expect(screen.getByTestId("cart-subtotal")).toHaveTextContent("45.00");
  await choose("kg");
  expect(input).toHaveValue(0.5);
  expect(fetch).toHaveBeenCalledTimes(1);
});
