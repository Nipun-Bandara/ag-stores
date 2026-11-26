import { expect, it, vi } from "vitest";
import HomePage from "@/app/page";

const mocks = vi.hoisted(() => ({ locale: "en", localizedRoute: false }));
vi.mock("@/lib/i18n/server", () => ({ getLocaleContext: async () => mocks }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(path);
  },
}));

it.each([
  { locale: "en", localizedRoute: false, destination: "/home" },
  { locale: "si", localizedRoute: true, destination: "/si/home" },
])(
  "starts everyone at the store Home ($locale)",
  async ({ locale, localizedRoute, destination }) => {
    Object.assign(mocks, { locale, localizedRoute });
    await expect(HomePage()).rejects.toThrow(destination);
  },
);
