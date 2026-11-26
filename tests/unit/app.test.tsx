import { describe, expect, it, vi } from "vitest";

import LandingPage from "@/app/landing/page";
import { getDictionary } from "@/lib/i18n/config";

const locale = vi.hoisted(() => ({ locale: "en", localizedRoute: false }));
vi.mock("@/lib/i18n/server", () => ({
  getLocaleContext: vi.fn(async () => locale),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(path);
  },
}));

// The landing page is switched off for now (its original code is kept,
// commented out, in src/app/landing/page.tsx). Restore its rendering tests
// from git history together with the page.
describe("application", () => {
  it.each([
    { localeValue: "en", localizedRoute: false, destination: "/home" },
    { localeValue: "si", localizedRoute: true, destination: "/si/home" },
  ])(
    "sends /landing to the store Home ($localeValue)",
    async ({ localeValue, localizedRoute, destination }) => {
      Object.assign(locale, { locale: localeValue, localizedRoute });
      await expect(LandingPage()).rejects.toThrow(destination);
    },
  );

  it("keeps matching English and Sinhala landing copy for when it returns", () => {
    const english = getDictionary("en").landing;
    const sinhala = getDictionary("si").landing;
    expect(Object.keys(sinhala)).toEqual(Object.keys(english));
    expect(sinhala.heroTitle).not.toBe(english.heroTitle);
  });
});
