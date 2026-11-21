import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import {
  customerAccountMenuItems,
  MobileAccountMenu,
} from "@/features/account/components/mobile-account-menu";
import { cartStore } from "@/features/cart/cart-store";
import { getMobileTabs } from "@/lib/navigation";

const state = vi.hoisted(() => ({ path: "/home", logout: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => state.path }));
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ logout: state.logout }),
}));

beforeEach(() => {
  state.path = "/home";
  state.logout.mockReset();
});
afterEach(() => {
  act(() => {
    cartStore.setOwner(null);
    cartStore.clear();
  });
  localStorage.clear();
  cleanup();
});

it("renders the four customer tabs with localized links and marks the current one", () => {
  state.path = "/si/categories/rice";
  render(
    <MobileBottomNav
      tabs={getMobileTabs("CUSTOMER")}
      locale="si"
      localizedRoute
    />,
  );
  const links = screen.getAllByRole("link");
  expect(links.map((link) => link.getAttribute("href"))).toEqual([
    "/si/home",
    "/si/products",
    "/si/cart",
    "/si/account",
  ]);
  expect(links[1]).toHaveAttribute("aria-current", "page");
  expect(links[0]).not.toHaveAttribute("aria-current");
  expect(screen.getByText("කරත්තය")).toBeVisible();
});

it("shows the cart line count on the Cart tab", () => {
  render(
    <MobileBottomNav
      tabs={getMobileTabs(null, { guest: true })}
      locale="en"
      localizedRoute={false}
    />,
  );
  expect(screen.queryByLabelText(/items in cart/)).not.toBeInTheDocument();
  act(() => {
    cartStore.add({
      id: "tea",
      name: "Tea",
      price: "100.00",
      stockQuantity: 5,
      imageUrl: null,
    });
  });
  expect(screen.getByLabelText("1 items in cart")).toHaveTextContent("1");
});

it("lists account destinations that have no tab, then signs out", () => {
  const hrefs = customerAccountMenuItems().map((item) => item.href);
  expect(hrefs).toEqual(
    expect.arrayContaining([
      "/account/orders",
      "/account/addresses",
      "/profile",
      "/account/security",
      "/notifications",
    ]),
  );
  for (const tab of ["/home", "/products", "/cart", "/account"])
    expect(hrefs).not.toContain(tab);

  state.logout.mockResolvedValue(undefined);
  render(<MobileAccountMenu locale="en" localizedRoute={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
  expect(state.logout).toHaveBeenCalledOnce();
});
