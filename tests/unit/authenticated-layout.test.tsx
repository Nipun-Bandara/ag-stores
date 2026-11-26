import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
  fireEvent,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImgHTMLAttributes } from "react";
import { globSync } from "node:fs";
import { AuthenticatedShell } from "@/features/auth/components/authenticated-shell";
import {
  DASHBOARD_BY_ROLE,
  canAccessWorkspace,
  getNavItemsForRole,
  getGuestNavGroups,
  getNavGroupsForRole,
  isNavItemActive,
  isPublicStorefrontPath,
  getMobileTabs,
  isMobileTabActive,
  activeMobileTabId,
  getRoleMenuItems,
  NAV_ITEMS,
  type Role,
} from "@/lib/navigation";
import type { AuthenticatedUser } from "@/types/auth";

const state = vi.hoisted(() => ({
  user: null as AuthenticatedUser | null,
  loading: false,
  path: "/account",
  replace: vi.fn(),
  logout: vi.fn(),
}));
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: state.user,
    isLoading: state.loading,
    logout: state.logout,
  }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => state.path,
  useRouter: () => ({ replace: state.replace, push: vi.fn() }),
}));
vi.mock("next/image", () => ({
  default: ({ alt }: ImgHTMLAttributes<HTMLImageElement>) => <span>{alt}</span>,
}));
vi.mock("@/components/ThemeToggle", () => ({
  ThemeToggle: () => <button>Toggle theme</button>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.loading = false;
  state.user = null;
  state.path = "/account";
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(cleanup);
function session(role: Role): AuthenticatedUser {
  return {
    id: "test-user",
    name: "Test User",
    email: "test@example.test",
    firstName: "Test",
    lastName: "User",
    phone: "+94770000000",
    role,
    preferredLanguage: "EN",
    status: "ACTIVE",
  };
}
function tabHrefs() {
  const nav = screen.queryByTestId("mobile-bottom-nav");
  return nav
    ? within(nav)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href"))
    : [];
}
/** Links outside the phone tab bar: the sidebar menu. */
function sidebarHrefs() {
  return screen
    .getAllByRole("link")
    .filter((link) => !link.closest('[data-testid="mobile-bottom-nav"]'))
    .filter((link) => link.dataset.testid !== "mobile-brand")
    .map((link) => link.getAttribute("href"));
}
function shell() {
  return (
    <AuthenticatedShell locale="en" localizedRoute={false}>
      <div>Private content</div>
    </AuthenticatedShell>
  );
}

describe("authenticated layout", () => {
  it.each(["CUSTOMER", "SHOP_OWNER", "ADMIN", "DELIVERY_PERSON"] as const)(
    "shows only the %s navigation and its dashboard",
    (role) => {
      state.user = session(role);
      state.path = DASHBOARD_BY_ROLE[role];
      render(shell());
      expect(screen.getByText("Private content")).toBeVisible();
      expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
        "href",
        getNavItemsForRole(role).find((item) => item.label === "Dashboard")!
          .href,
      );
      expect(sidebarHrefs()).toEqual(
        getNavItemsForRole(role).map((item) => item.href),
      );
      // Every role gets phone tabs; their links mirror the role's tab config.
      expect(tabHrefs()).toEqual(getMobileTabs(role).map((tab) => tab.href));
      expect(
        getNavGroupsForRole(role).every((group) => group.items.length > 0),
      ).toBe(true);
    },
  );
  it("does not reveal private content or a sidebar during session loading", () => {
    state.loading = true;
    render(shell());
    expect(screen.getByRole("status", { name: "Loading" })).toBeVisible();
    expect(screen.queryByText("Private content")).not.toBeInTheDocument();
    expect(state.replace).not.toHaveBeenCalled();
  });
  it("sends guests to localized auth and remembers their destination", async () => {
    state.path = "/si/owner/orders";
    render(
      <AuthenticatedShell locale="si" localizedRoute>
        <div>Private content</div>
      </AuthenticatedShell>,
    );
    await waitFor(() =>
      expect(state.replace).toHaveBeenCalledWith(
        "/si/auth?returnTo=%2Fsi%2Fowner%2Forders",
      ),
    );
    expect(screen.queryByText("Private content")).not.toBeInTheDocument();
  });
  it("blocks a customer from directly opening the admin workspace", async () => {
    state.user = session("CUSTOMER");
    state.path = "/admin/users";
    render(shell());
    await waitFor(() =>
      expect(state.replace).toHaveBeenCalledWith("/forbidden"),
    );
    expect(screen.queryByText("Private content")).not.toBeInTheDocument();
  });
  it("preserves localized links and highlights only the nested page", () => {
    state.user = session("SHOP_OWNER");
    state.path = "/si/owner/orders/123";
    render(
      <AuthenticatedShell locale="si" localizedRoute>
        Orders
      </AuthenticatedShell>,
    );
    // The sidebar and the phone tab bar both mark Orders as current.
    const orders = screen.getAllByRole("link", { name: "ඇණවුම්" });
    expect(orders).toHaveLength(2);
    for (const link of orders) {
      expect(link).toHaveAttribute("aria-current", "page");
      expect(link).toHaveAttribute("href", "/si/owner/orders");
    }
    for (const link of screen.getAllByRole("link", {
      name: /පාලක පුවරුව|මුල් පිටුව/,
    }))
      expect(link).not.toHaveAttribute("aria-current");
    expect(isNavItemActive("/owner/orders-history", "/owner/orders")).toBe(
      false,
    );
  });
  it("collapses the sidebar without replacing the page", () => {
    state.user = session("CUSTOMER");
    const { container } = render(shell());
    fireEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
    expect(container.querySelector('[data-slot="sidebar"]')).toHaveAttribute(
      "data-state",
      "collapsed",
    );
    expect(screen.getByText("Private content")).toBeVisible();
  });
  it("links only to existing pages", () => {
    const pagePaths = new Set(
      globSync("src/app/**/page.tsx").map((file) =>
        file
          .replace(/^src\/app/, "")
          .replace(/\/\([^/]+\)/g, "")
          .replace(/\/page\.tsx$/, ""),
      ),
    );
    for (const { href } of NAV_ITEMS) {
      expect(pagePaths.has(href), href).toBe(true);
    }
    expect(getNavItemsForRole("FARMER")).toEqual([]);
  });
  it("limits catalog pages to the customer workspace", () => {
    for (const path of [
      "/products",
      "/products/example",
      "/categories/example",
    ]) {
      expect(canAccessWorkspace("CUSTOMER", path)).toBe(true);
      expect(canAccessWorkspace("SHOP_OWNER", path)).toBe(false);
      expect(canAccessWorkspace("ADMIN", path)).toBe(false);
      expect(canAccessWorkspace("DELIVERY_PERSON", path)).toBe(false);
    }
    expect(isNavItemActive("/si/categories/example", "/products")).toBe(true);
  });

  it("shows the storefront to guests with a browsing menu and a sign-in link", () => {
    state.path = "/products";
    render(
      <AuthenticatedShell locale="en" localizedRoute={false} allowGuests>
        <div>Catalog</div>
      </AuthenticatedShell>,
    );
    expect(screen.getByText("Catalog")).toBeVisible();
    expect(state.replace).not.toHaveBeenCalled();
    // Sidebar menu and its sign-in link, then the top bar's Log in button. Both
    // sign-in links carry no return path, so login lands by role.
    expect(sidebarHrefs()).toEqual([
      "/home",
      "/products",
      "/cart",
      "/auth",
      "/auth",
    ]);
    expect(screen.getByTestId("header-login")).toHaveTextContent("Log in");
    // Phones sign in from the Account tab instead.
    expect(screen.getByTestId("header-login")).toHaveClass("max-md:hidden");
    expect(tabHrefs()).toEqual(["/home", "/products", "/cart", "/account"]);
  });
  it("renders public pages while the session is still loading", () => {
    state.loading = true;
    state.path = "/cart";
    render(
      <AuthenticatedShell locale="en" localizedRoute={false} allowGuests>
        <div>Cart page</div>
      </AuthenticatedShell>,
    );
    expect(screen.getByText("Cart page")).toBeVisible();
  });
  it("still sends guests to sign in for private pages in a guest-friendly shell", async () => {
    state.path = "/checkout";
    render(
      <AuthenticatedShell locale="en" localizedRoute={false} allowGuests>
        <div>Checkout</div>
      </AuthenticatedShell>,
    );
    await waitFor(() =>
      expect(state.replace).toHaveBeenCalledWith("/auth?returnTo=%2Fcheckout"),
    );
    expect(screen.queryByText("Checkout")).not.toBeInTheDocument();
  });
  it("treats only browsing and the cart as public", () => {
    for (const path of [
      "/products",
      "/si/products/x",
      "/categories/x",
      "/cart",
    ])
      expect(isPublicStorefrontPath(path), path).toBe(true);
    for (const path of ["/checkout", "/account", "/orders/x", "/productsx"])
      expect(isPublicStorefrontPath(path), path).toBe(false);
    expect(
      getGuestNavGroups().flatMap((group) => group.items.map((i) => i.href)),
    ).toEqual(["/home", "/products", "/cart"]);
  });

  it("highlights the tab for nested and related pages", () => {
    const [home, shop, cart, account] = getMobileTabs("CUSTOMER");
    expect(isMobileTabActive("/si/home", home!)).toBe(true);
    expect(isMobileTabActive("/categories/x", shop!)).toBe(true);
    expect(isMobileTabActive("/checkout", cart!)).toBe(true);
    expect(isMobileTabActive("/orders/x", account!)).toBe(true);
    expect(isMobileTabActive("/account/orders", account!)).toBe(true);
    expect(isMobileTabActive("/products", account!)).toBe(false);
    expect(getMobileTabs(null)).toEqual([]);
    expect(getMobileTabs(null, { guest: true })).toHaveLength(4);
  });
  it("gives every role at most five tabs, ending with a menu for staff", () => {
    for (const role of [
      "SHOP_OWNER",
      "ORDER_STAFF",
      "DELIVERY_PERSON",
      "ADMIN",
    ] as const) {
      const tabs = getMobileTabs(role);
      expect(tabs.length).toBeLessThanOrEqual(5);
      expect(tabs.at(-1)).toMatchObject({ href: "/menu", overflow: true });
      for (const tab of tabs) {
        expect(canAccessWorkspace(role, tab.href), `${role} ${tab.href}`).toBe(
          true,
        );
      }
    }
  });
  it("picks the most specific tab and falls back to the menu tab", () => {
    const owner = getMobileTabs("SHOP_OWNER");
    expect(activeMobileTabId("/owner", owner)).toBe("ownerDashboard");
    expect(activeMobileTabId("/si/owner/orders/1", owner)).toBe("ownerOrders");
    expect(activeMobileTabId("/owner/categories", owner)).toBe("ownerProducts");
    expect(activeMobileTabId("/owner/reports", owner)).toBe("roleMenu");
    const staff = getMobileTabs("ORDER_STAFF");
    expect(activeMobileTabId("/staff/returns", staff)).toBe("staffReturns");
    expect(activeMobileTabId("/staff", staff)).toBe("staffOrders");
    expect(activeMobileTabId("/profile", staff)).toBe("roleMenu");
    expect(
      activeMobileTabId("/account/orders", getMobileTabs("CUSTOMER")),
    ).toBe("account");
  });
  it("lists only destinations without a tab on the role menu", () => {
    expect(getRoleMenuItems("SHOP_OWNER").map((item) => item.href)).toEqual([
      "/owner/returns",
      "/owner/staff",
      "/owner/categories",
      "/owner/delivery-personnel",
      "/owner/reports",
      "/owner/settings",
      "/notifications",
      "/profile",
    ]);
    expect(getRoleMenuItems("ORDER_STAFF").map((item) => item.href)).toEqual([
      "/profile",
    ]);
    expect(canAccessWorkspace("ADMIN", "/menu")).toBe(true);
  });
  it("sends owners and staff from the storefront to their own workspace", async () => {
    state.user = session("SHOP_OWNER");
    state.path = "/si/products";
    render(
      <AuthenticatedShell locale="si" localizedRoute allowGuests>
        <div>Catalog</div>
      </AuthenticatedShell>,
    );
    await waitFor(() =>
      expect(state.replace).toHaveBeenCalledWith("/si/owner"),
    );
    expect(screen.queryByText("Catalog")).not.toBeInTheDocument();
  });
});
