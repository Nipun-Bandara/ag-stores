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

const { login, register } = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
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
}));
vi.mock("@/lib/i18n/server", () => ({
  getLocaleContext: async () => ({ locale: "si", localizedRoute: true }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
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
      "/si",
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
    fireEvent.change(document.getElementById("register-name")!, {
      target: { value: "Sample Customer" },
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
          name: "Sample Customer",
          email: "customer@example.test",
          phone: undefined,
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
      target: { value: "farmer@example.test" },
    });
    fireEvent.change(document.getElementById("login-password")!, {
      target: { value: "test-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() =>
      expect(login).toHaveBeenCalledWith(
        { identifier: "farmer@example.test", password: "test-password" },
        "/si/account",
      ),
    );
  });

  it("shows a failed sign-in without navigating away", async () => {
    login.mockRejectedValue(new Error("Invalid credentials"));
    render(await AuthPage({ searchParams: Promise.resolve({}) }));
    fireEvent.change(document.getElementById("login-identifier")!, {
      target: { value: "farmer@example.test" },
    });
    fireEvent.change(document.getElementById("login-password")!, {
      target: { value: "test-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid credentials",
    );
    expect(login).toHaveBeenCalledWith(expect.anything(), "/si/dashboard");
  });

  it("redirects protected routes to the single auth page, preserving the locale", () => {
    for (const path of ["/account", "/si/account"]) {
      const response = proxy(new NextRequest(`http://localhost${path}`));
      const destination = new URL(response.headers.get("location")!);
      expect(destination.pathname).toBe(
        path.startsWith("/si/") ? "/si/auth" : "/auth",
      );
      expect(destination.searchParams.get("returnTo")).toBe(path);
    }
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
});
