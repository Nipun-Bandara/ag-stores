import {
  cleanup,
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImgHTMLAttributes } from "react";
import { existsSync } from "node:fs";
import { AuthenticatedShell } from "@/features/auth/components/authenticated-shell";
import {
  DASHBOARD_BY_ROLE,
  getNavItemsForRole,
  getNavGroupsForRole,
  isNavItemActive,
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
  window.matchMedia = vi
    .fn()
    .mockImplementation(() => ({
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
    phone: null,
    role,
    preferredLanguage: "EN",
    status: "ACTIVE",
  };
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
        DASHBOARD_BY_ROLE[role],
      );
      const hrefs = screen
        .getAllByRole("link")
        .map((link) => link.getAttribute("href"));
      expect(hrefs).toEqual(getNavItemsForRole(role).map((item) => item.href));
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
    expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute(
      "href",
      "/si/owner/orders",
    );
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
    for (const { href } of NAV_ITEMS) {
      expect(
        existsSync(`src/app/(ui)${href}/page.tsx`) ||
          existsSync(`src/app${href}/page.tsx`),
        href,
      ).toBe(true);
    }
    expect(getNavItemsForRole("FARMER")).toEqual([]);
  });
});
