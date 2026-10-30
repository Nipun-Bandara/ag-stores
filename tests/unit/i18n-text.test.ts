import { describe, expect, it } from "vitest";

import {
  formatLocaleDate,
  translate,
  translateOrderNotification,
} from "@/lib/i18n/text";

describe("application localization", () => {
  it("translates shared UI copy and preserves English", () => {
    expect(translate("si", "Ready for delivery")).toBe("බෙදාහැරීමට සූදානම්");
    expect(translate("en", "Ready for delivery")).toBe("Ready for delivery");
    expect(translate("si", " Welcome back ")).toBe(" නැවත සාදරයෙන් පිළිගනිමු ");
  });

  it("interpolates order and accessibility labels", () => {
    expect(translate("si", "Select order {id}", { id: "123" })).toBe(
      "ඇණවුම 123 තෝරන්න",
    );
    expect(
      translateOrderNotification(
        "si",
        "Your order ABCD1234 has been delivered.",
        "abcd1234-9876",
      ),
    ).toBe("ඔබේ ඇණවුම ABCD1234 බෙදාහැර ඇත.");
  });

  it("formats dates in the active language and Sri Lanka time", () => {
    const date = "2026-10-14T22:00:00.000Z";
    expect(formatLocaleDate("en", date)).toContain("Oct 15");
    expect(formatLocaleDate("si", date)).toContain("15");
    expect(formatLocaleDate("si", date)).toMatch(/[^\x00-\x7F]/);
  });
});
