import { beforeEach, expect, it, vi } from "vitest";
import HomePage from "@/app/page";

const mocks = vi.hoisted(() => ({
  locale: { locale: "en", localizedRoute: false },
  role: null as string | null,
}));
vi.mock("@/lib/i18n/server", () => ({
  getLocaleContext: async () => mocks.locale,
}));
vi.mock("@/lib/auth/server", () => ({
  getAuthenticatedUser: async () => (mocks.role ? { role: mocks.role } : null),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(path);
  },
}));

beforeEach(() => {
  mocks.role = null;
});

it.each([
  { locale: "en", localizedRoute: false, destination: "/auth" },
  { locale: "si", localizedRoute: true, destination: "/si/auth" },
])(
  "opens sign-in for visitors at the app entry ($locale)",
  async ({ locale, localizedRoute, destination }) => {
    mocks.locale = { locale, localizedRoute };
    await expect(HomePage()).rejects.toThrow(destination);
  },
);

it("sends signed-in customers to the store home", async () => {
  mocks.locale = { locale: "si", localizedRoute: true };
  mocks.role = "CUSTOMER";
  await expect(HomePage()).rejects.toThrow("/si/home");
});

it.each(["SHOP_OWNER", "ORDER_STAFF", "DELIVERY_PERSON", "ADMIN"])(
  "sends a signed-in %s to sign-in",
  async (role) => {
    mocks.locale = { locale: "en", localizedRoute: false };
    mocks.role = role;
    await expect(HomePage()).rejects.toThrow("/auth");
  },
);
