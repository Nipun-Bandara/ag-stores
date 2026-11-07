import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { ProductCard } from "@/features/storefront/components/product-card";
import { cartStore } from "@/features/cart/cart-store";
import type { StorefrontProductView } from "@/services/storefront.service";
const product: StorefrontProductView = {
  id: "tea",
  shopId: "shop",
  shopName: "Colombo Fresh Market",
  categoryId: "beverages",
  categoryNameEn: "Beverages",
  categoryNameSi: null,
  nameEn: "Ceylon Tea",
  nameSi: "සිලෝන් තේ",
  descriptionEn: null,
  descriptionSi: null,
  price: "100.00",
  discountTiers: [{ minimumQuantity: 1, discountAmount: "10.00" }],
  sellingUnit: "UNIT",
  minimumOrderQuantity: 1,
  orderingIncrement: 1,
  stockQuantity: 5,
  imageUrl: null,
  isOutOfStock: false,
};
beforeEach(() => cartStore.clear());
afterEach(cleanup);
it("shows a compact name, category, price and image fallback with no expanded pricing breakdown", () => {
  render(<ProductCard product={product} />);
  expect(screen.getByRole("heading", { name: "Ceylon Tea" })).toBeVisible();
  expect(screen.getByText("Beverages")).toBeVisible();
  expect(screen.getByText("No image")).toBeVisible();
  expect(screen.getByText(/LKR 90.00/)).toBeVisible();
  expect(screen.getByText(/LKR 100.00/).tagName).toBe("DEL");
  expect(screen.queryByText("Colombo Fresh Market")).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Add Ceylon Tea to cart" }),
  );
  expect(
    screen.queryByText(/Line total|Line savings|Higher-quantity offers/),
  ).not.toBeInTheDocument();
});
it("localizes product links and disables adding out-of-stock items", () => {
  render(
    <ProductCard
      product={{ ...product, stockQuantity: 0, isOutOfStock: true }}
      locale="si"
      localizedRoute
    />,
  );
  expect(
    screen.getByRole("heading", { name: "සිලෝන් තේ" }).querySelector("a"),
  ).toHaveAttribute("href", "/si/products/tea");
  expect(screen.getByRole("button")).toBeDisabled();
});
