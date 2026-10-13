import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { DASHBOARD_BY_ROLE, type Role } from "@/lib/navigation";
const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  path: "/auth",
}));
vi.mock("next/navigation", () => ({
  useRouter: () => nav,
  usePathname: () => nav.path,
}));
function Probe({ returnTo = "/dashboard" }: { returnTo?: string }) {
  const { user, login, logout, isLoading } = useAuth();
  return (
    <>
      <p>{isLoading ? "Loading" : (user?.role ?? "Guest")}</p>
      <button
        onClick={() =>
          void login(
            { identifier: "demo@example.test", password: "Password123!" },
            returnTo,
          )
        }
      >
        Login
      </button>
      <button onClick={() => void logout()}>Logout</button>
    </>
  );
}
const fetchMock = vi.fn();
function response(role?: Role) {
  return {
    ok: Boolean(role),
    json: async () => ({
      data: role
        ? {
            id: "user-id",
            name: "Demo",
            email: "demo@example.test",
            phone: null,
            role,
            status: "ACTIVE",
            preferredLanguage: "EN",
          }
        : undefined,
    }),
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  nav.path = "/auth";
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});
describe("session-backed auth context", () => {
  it.each(["CUSTOMER", "SHOP_OWNER", "ADMIN", "DELIVERY_PERSON"] as const)(
    "signs in %s using the current API and dashboard",
    async (role) => {
      fetchMock
        .mockResolvedValueOnce(response())
        .mockResolvedValueOnce(response(role));
      render(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      );
      await screen.findByText("Guest");
      fireEvent.click(screen.getByRole("button", { name: "Login" }));
      await waitFor(() =>
        expect(nav.replace).toHaveBeenCalledWith(DASHBOARD_BY_ROLE[role]),
      );
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/auth/login",
        expect.objectContaining({
          body: JSON.stringify({
            identifier: "demo@example.test",
            password: "Password123!",
          }),
        }),
      );
    },
  );
  it("uses the session API instead of trusting stale local storage", async () => {
    localStorage.setItem("user", JSON.stringify({ role: "ADMIN" }));
    fetchMock.mockResolvedValueOnce(response());
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(await screen.findByText("Guest")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/session",
      expect.objectContaining({ cache: "no-store" }),
    );
  });
  it("preserves permitted localized return paths", async () => {
    fetchMock
      .mockResolvedValueOnce(response())
      .mockResolvedValueOnce(response("SHOP_OWNER"));
    render(
      <AuthProvider>
        <Probe returnTo="/si/owner/orders?status=PENDING" />
      </AuthProvider>,
    );
    await screen.findByText("Guest");
    fireEvent.click(screen.getByText("Login"));
    await waitFor(() =>
      expect(nav.replace).toHaveBeenCalledWith(
        "/si/owner/orders?status=PENDING",
      ),
    );
  });
  it("does not send a customer to an admin return path", async () => {
    fetchMock
      .mockResolvedValueOnce(response())
      .mockResolvedValueOnce(response("CUSTOMER"));
    render(
      <AuthProvider>
        <Probe returnTo="/admin/users" />
      </AuthProvider>,
    );
    await screen.findByText("Guest");
    fireEvent.click(screen.getByText("Login"));
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/account"));
  });
  it("revokes the server session when signing out", async () => {
    nav.path = "/si/owner";
    fetchMock
      .mockResolvedValueOnce(response("SHOP_OWNER"))
      .mockResolvedValueOnce({ ok: true });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText("SHOP_OWNER");
    fireEvent.click(screen.getByText("Logout"));
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/si/auth"));
    expect(fetchMock).toHaveBeenLastCalledWith("/api/auth/logout", {
      method: "POST",
    });
    expect(screen.getByText("Guest")).toBeVisible();
  });
});
