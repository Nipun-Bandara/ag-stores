import { describe, expect, it } from "vitest";

import { localizeBilingual, storefrontCopy } from "@/lib/i18n/storefront";

describe("storefront localization foundation", () => {
  it("selects Sinhala content when available and falls back to English", () => {
    expect(localizeBilingual("Tea", "තේ", "si")).toBe("තේ");
    expect(localizeBilingual("Tea", null, "si")).toBe("Tea");
    expect(localizeBilingual("Tea", "තේ", "en")).toBe("Tea");
    expect(storefrontCopy.si.outOfStock).toBeTruthy();
  });
});
