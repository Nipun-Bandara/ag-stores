import { describe, expect, it } from "vitest";

import {
  getDictionary,
  localizeBilingual,
  localizedPath,
  routePath,
} from "@/lib/i18n/config";

function translationKeys(
  value: Record<string, unknown>,
  prefix = "",
): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === "object" && child !== null
      ? translationKeys(child as Record<string, unknown>, path)
      : [path];
  });
}

describe("localization", () => {
  it("keeps English and Sinhala dictionaries complete and non-empty", () => {
    const english = getDictionary("en") as unknown as Record<string, unknown>;
    const sinhala = getDictionary("si") as unknown as Record<string, unknown>;

    expect(translationKeys(sinhala)).toEqual(translationKeys(english));
    expect(
      Object.values(sinhala).every((section) =>
        Object.values(section as Record<string, string>).every(
          (translation) => translation.trim().length > 0,
        ),
      ),
    ).toBe(true);
  });

  it("selects locale-specific product text and falls back to English", () => {
    expect(localizeBilingual("Ceylon Tea", "ලංකා තේ", "en")).toBe("Ceylon Tea");
    expect(localizeBilingual("Ceylon Tea", "ලංකා තේ", "si")).toBe("ලංකා තේ");
    expect(localizeBilingual("Ceylon Tea", null, "si")).toBe("Ceylon Tea");
    expect(localizeBilingual("Ceylon Tea", "   ", "si")).toBe("Ceylon Tea");
  });

  it("builds localized routes without double-prefixing", () => {
    expect(localizedPath("/products", "si")).toBe("/si/products");
    expect(localizedPath("/en/products", "si")).toBe("/si/products");
    expect(localizedPath("/", "en")).toBe("/en");
    expect(routePath("/products", "si", false)).toBe("/products");
  });
});
