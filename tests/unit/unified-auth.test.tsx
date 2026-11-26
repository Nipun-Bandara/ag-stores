import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AuthPage from "@/app/auth/page";
import { safeAuthReturnTo } from "@/features/auth/return-to";
import { proxy } from "@/proxy";
import { NextRequest } from "next/server";

const { login, register, toastError } = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ login, register }),
}));
vi.mock("@/components/DotGrid", () => ({ default: () => null }));
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/si/auth",
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
const session = vi.hoisted(() => ({ user: null as { role: string } | null }));
vi.mock("@/lib/auth/server", () => ({
  getAuthenticatedUser: async () => session.user,
}));
vi.mock("@/lib/i18n/server", () => ({
  getLocaleContext: async () => ({ locale: "si", localizedRoute: true }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: toastError } }));

beforeEach(() => {
  vi.clearAllMocks();
  session.user = null;
  const style = document.createElement("style");
  style.textContent = ".hidden { display: none; }";
  style.id = "auth-test-styles";
  document.head.append(style);
});
afterEach(() => {
  cleanup();
  document.getElementById("auth-test-styles")?.remove();
});

describe("unified authentication page", () => {
  it("opens registration from its link and switches back to sign in", async () => {
    render(
      await AuthPage({ searchParams: Promise.resolve({ mode: "register" }) }),
    );
    expect(screen.getByText("Create Account")).toBeVisible();
    expect(screen.getByText("Welcome back")).not.toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Already have an account? Sign in" }),
    );
    expect(screen.getByText("Welcome back")).toBeVisible();
    expect(screen.getByText("Create Account")).not.toBeVisible();
    expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute(
      "href",
      "/si/home",
    );
  });

  it("registers customers through the current API contract without exposing staff roles", async () => {
    register.mockResolvedValue(undefined);
    render(
      await AuthPage({ searchParams: Promise.resolve({ mode: "register" }) }),
    );
    expect(screen.queryByLabelText("Role")).not.toBeInTheDocument();
    fireEvent.change(document.getElementById("register-email")!, {
      target: { value: "customer@example.test" },
    });
    fireEvent.change(document.getElementById("register-firstName")!, {
      target: { value: "Sample" },
    });
    fireEvent.change(document.getElementById("register-lastName")!, {
      target: { value: "Customer" },
    });
    fireEvent.change(document.getElementById("register-phone")!, {
      target: { value: "0771234567" },
    });
    fireEvent.change(document.getElementById("register-password")!, {
      target: { value: "SecurePassword123!" },
    });
    fireEvent.submit(
      document.getElementById("register-email")!.closest("form")!,
    );
    await waitFor(() =>
      expect(register).toHaveBeenCalledWith(
        {
          firstName: "Sample",
          lastName: "Customer",
          email: "customer@example.test",
          phone: "+94771234567",
          password: "SecurePassword123!",
          preferredLanguage: "EN",
        },
        "/si/dashboard",
      ),
    );
  });

  it("submits the new login form through AuthContext and preserves returnTo", async () => {
    login.mockResolvedValue(undefined);
    render(
      await AuthPage({
        searchParams: Promise.resolve({ returnTo: "/si/account" }),
      }),
    );
    fireEvent.change(document.getElementById("login-identifier")!, {
      target: { value: "0771234567" },
    });
    fireEvent.change(document.getElementById("login-password")!, {
      target: { value: "test-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() =>
      expect(login).toHaveBeenCalledWith(
        { identifier: "0771234567", password: "test-password" },
        "/si/account",
      ),
    );
  });

  it("shows a failed sign-in without navigating away", async () => {
    login.mockRejectedValue(new Error("Invalid credentials"));
    render(await AuthPage({ searchParams: Promise.resolve({}) }));
    fireEvent.change(document.getElementById("login-identifier")!, {
      target: { value: "0771234567" },
    });
    fireEvent.change(document.getElementById("login-password")!, {
      target: { value: "test-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Invalid credentials"),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(login).toHaveBeenCalledWith(expect.anything(), "/si/dashboard");
  });

  it("redirects protected routes to the single auth page, preserving the locale", () => {
    for (const path of [
      "/account",
      "/si/account",
      "/checkout",
      "/si/account/orders",
    ]) {
      const response = proxy(new NextRequest(`http://localhost${path}`));
      const destination = new URL(response.headers.get("location")!);
      expect(destination.pathname).toBe(
        path.startsWith("/si/") ? "/si/auth" : "/auth",
      );
      expect(destination.searchParams.get("returnTo")).toBe(path);
    }
  });

  it("lets guests browse the storefront and cart without signing in", () => {
    for (const path of [
      "/products",
      "/si/products?search=tea&categoryId=beverages",
      "/products/example",
      "/categories/example",
      "/cart",
    ]) {
      const response = proxy(new NextRequest(`http://localhost${path}`));
      expect(response.headers.get("location")).toBeNull();
    }
  });

  it("keeps the checkout destination when asking a guest to sign in", () => {
    const response = proxy(new NextRequest("http://localhost/si/checkout"));
    const destination = new URL(response.headers.get("location")!);
    expect(destination.pathname).toBe("/si/auth");
    expect(destination.searchParams.get("returnTo")).toBe("/si/checkout");
  });

  it("rejects external and authentication-loop return destinations", () => {
    for (const value of [
      undefined,
      ["/account"],
      "https://example.test",
      "//example.test",
      "/\\example.test",
      "/\n/example.test",
      "/auth",
      "/si/auth?mode=register",
      "/en/login",
      "/register",
    ]) {
      expect(safeAuthReturnTo(value)).toBeUndefined();
    }
    expect(safeAuthReturnTo("/si/account?tab=orders")).toBe(
      "/si/account?tab=orders",
    );
  });

  it("sends signed-in visitors on: customers to Home, others to their dashboard", async () => {
    session.user = { role: "CUSTOMER" };
    await expect(
      AuthPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("redirect:/si/home");
    session.user = { role: "SHOP_OWNER" };
    await expect(
      AuthPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("redirect:/si/owner");
    // An allowed return path still wins; one for another role does not.
    session.user = { role: "CUSTOMER" };
    await expect(
      AuthPage({ searchParams: Promise.resolve({ returnTo: "/si/checkout" }) }),
    ).rejects.toThrow("redirect:/si/checkout");
    await expect(
      AuthPage({ searchParams: Promise.resolve({ returnTo: "/admin/users" }) }),
    ).rejects.toThrow("redirect:/si/home");
  });
});
