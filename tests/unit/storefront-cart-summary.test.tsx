import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import { cartStore } from "@/features/cart/cart-store";
import { StorefrontCartSummary } from "@/features/cart/components/storefront-cart-summary";
import { LocaleProvider } from "@/features/i18n/components/locale-provider";

const product = {
  id: "tea",
  name: "Tea",
  price: "100.00",
  stockQuantity: 5,
  imageUrl: null,
};

afterEach(() => {
  cleanup();
  cartStore.clear();
  cartStore.setOwner(null);
  localStorage.clear();
});

it("updates the count and subtotal when products are added, reduced, and removed", () => {
  render(<StorefrontCartSummary locale="en" localizedRoute={false} />);
  const summary = within(
    screen.getByRole("complementary", { name: "Cart summary" }),
  );
  expect(summary.getByRole("status")).toHaveTextContent("0 items");
  expect(summary.getByRole("link", { name: "View cart" })).toHaveAttribute(
    "href",
    "/cart",
  );

  act(() => {
    cartStore.add(product);
    cartStore.add(product);
  });
  expect(summary.getByRole("status")).toHaveTextContent("1 item");
  expect(summary.getByRole("status")).toHaveTextContent("LKR 200.00");

  act(() => {
    cartStore.updateQuantity(product.id, 1);
  });
  expect(summary.getByRole("status")).toHaveTextContent("1 item");
  expect(summary.getByRole("status")).toHaveTextContent("LKR 100.00");

  act(() => {
    cartStore.remove(product.id);
  });
  expect(summary.getByRole("status")).toHaveTextContent("0 items");
  expect(summary.getByRole("status")).toHaveTextContent("LKR 0.00");
});

it("includes a previously saved cart and uses Sinhala copy and the localized cart route", () => {
  localStorage.setItem(
    "ag-stores-cart-v2:customer-summary",
    JSON.stringify({
      items: [{ ...product, quantity: 3 }],
    }),
  );
  cartStore.setOwner("customer-summary");
  render(
    <LocaleProvider locale="si">
      <StorefrontCartSummary locale="si" localizedRoute />
    </LocaleProvider>,
  );
  expect(screen.getByRole("status")).toHaveTextContent("අයිතම 1ක්");
  expect(screen.getByRole("status")).toHaveTextContent("LKR 300.00");
  expect(screen.getByRole("link", { name: "කරත්තය බලන්න" })).toHaveAttribute(
    "href",
    "/si/cart",
  );
});
