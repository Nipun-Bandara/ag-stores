import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { CartItem } from "@/features/cart/cart-state";
import type { CartQuote } from "@/services/cart.service";
import { CheckoutView } from "@/features/checkout/components/checkout-view";
const mocks = vi.hoisted(() => ({
  items: [] as CartItem[],
  updateFromQuote: vi.fn(),
  clear: vi.fn(),
  push: vi.fn(),
}));
vi.mock("@/features/cart/cart-store", () => ({
  useCart: () => ({ items: mocks.items, clear: mocks.clear }),
  cartStore: { updateFromQuote: mocks.updateFromQuote },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
const addresses = [
  {
    id: "address",
    label: "Home",
    address: "1 Test Road",
    latitude: "6.9",
    longitude: "79.8",
    isDefault: true,
  },
];
const product = {
  id: "rice",
  name: "Rice",
  price: "999.00",
  stockQuantity: 100,
  imageUrl: null,
  sellingUnit: "UNIT" as const,
  quantity: 1,
};
function quote(
  quantity: number,
  unitPrice: string,
  lineTotal: string,
): CartQuote {
  return {
    items: [
      {
        productId: "rice",
        name: "Rice",
        nameSi: null,
        quantity,
        sellingUnit: "UNIT",
        stockQuantity: 100,
        minimumOrderQuantity: 1,
        orderingIncrement: 1,
        regularPrice: "100.00",
        unitPrice,
        appliedDiscount: quantity === 1 ? "5.00" : "7.00",
        lineTotal,
        regularLineTotal: quantity === 1 ? "100.00" : "300.00",
        savings: quantity === 1 ? "5.00" : "21.00",
        discountTiers: [
          { minimumQuantity: 1, discountAmount: "5.00" },
          { minimumQuantity: 3, discountAmount: "7.00" },
        ],
      },
    ],
    subtotal: lineTotal,
    deliveryFee: "0.00",
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.items = [product];
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("replaces every displayed line with authoritative quantities, rates, savings and totals", async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: quote(1, "95.00", "95.00") }),
  });
  vi.stubGlobal("fetch", fetch);
  render(<CheckoutView addresses={addresses} />);
  await waitFor(() =>
    expect(screen.getByTestId("checkout-subtotal")).toHaveTextContent("95.00"),
  );
  expect(screen.getByText(/Regular price.*100.00/)).toBeInTheDocument();
  expect(screen.getByText(/Our price.*95.00/)).toBeInTheDocument();
  expect(screen.getByText(/Line savings.*5.00/)).toBeInTheDocument();
  expect(screen.queryByText(/999.00/)).not.toBeInTheDocument();
  expect(mocks.updateFromQuote).toHaveBeenCalled();
  expect(JSON.parse(fetch.mock.calls[0]![1].body)).toEqual({
    items: [{ productId: "rice", quantity: 1, sellingUnit: "UNIT" }],
  });
});
it("discards stale JSON and failed responses even if abort is ignored, and hides old lines while quoting", async () => {
  const resolvers: Array<(value: unknown) => void> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise((resolve) => resolvers.push(resolve))),
  );
  const view = render(<CheckoutView addresses={addresses} />);
  let resolveJson: (value: unknown) => void = () => {};
  await act(async () =>
    resolvers[0]!({
      ok: true,
      json: () =>
        new Promise((resolve) => {
          resolveJson = resolve;
        }),
    }),
  );
  mocks.items = [{ ...product, quantity: 3 }];
  view.rerender(<CheckoutView addresses={addresses} />);
  expect(
    screen.getByRole("button", { name: "Confirm Cash on Delivery order" }),
  ).toBeDisabled();
  await act(async () =>
    resolvers[1]!({
      ok: true,
      json: async () => ({ data: quote(3, "93.00", "279.00") }),
    }),
  );
  await waitFor(() =>
    expect(screen.getByText(/Our price.*93.00/)).toBeInTheDocument(),
  );
  await act(async () => resolveJson({ data: quote(1, "95.00", "95.00") }));
  expect(screen.getByTestId("checkout-subtotal")).toHaveTextContent("279.00");
  expect(screen.queryByText(/Our price.*95.00/)).not.toBeInTheDocument();
  expect(mocks.updateFromQuote).toHaveBeenCalledTimes(1);
  mocks.items = [product];
  view.rerender(<CheckoutView addresses={addresses} />);
  expect(screen.queryByText(/Our price.*93.00/)).not.toBeInTheDocument();
  await act(async () =>
    resolvers[2]!({
      ok: false,
      json: async () => ({ error: { message: "Product unavailable" } }),
    }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Product unavailable");
  expect(
    screen.getByRole("button", { name: "Confirm Cash on Delivery order" }),
  ).toBeDisabled();
});
