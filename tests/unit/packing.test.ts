import { describe, expect, it } from "vitest";
import {
  exceedsWeightAllowance,
  milliToDecimal,
  packedLineTotal,
  packedWeightValid,
  weightDifferenceMilli,
} from "@/lib/packing";
import { translateOrderNotification } from "@/lib/i18n/text";

describe("packed KG arithmetic", () => {
  it("accepts positive weights to three decimals, independent of ordering increments", () => {
    for (const weight of ["0.001", "1", "1.04", "1.045"])
      expect(packedWeightValid(weight)).toBe(true);
    for (const weight of ["0", "-1", "1.0001", "nope"])
      expect(packedWeightValid(weight)).toBe(false);
  });
  it("rounds charged lines half up using the checkout rate", () => {
    expect(packedLineTotal("180.00", "1.98")).toBe("356.40");
    expect(packedLineTotal("10.01", "0.5")).toBe("5.01");
    expect(packedLineTotal("0.01", "0.001")).toBe("0.00");
    expect(weightDifferenceMilli("1", "1.04")).toBe(BigInt(40));
    expect(milliToDecimal(weightDifferenceMilli("1.04", "1.02"))).toBe(
      "-0.020",
    );
  });
  it("enforces the configured allowance exactly at the boundary", () => {
    expect(exceedsWeightAllowance("1", "1.1", "10.00")).toBe(false);
    expect(exceedsWeightAllowance("1", "1.101", "10.00")).toBe(true);
    expect(exceedsWeightAllowance("1", "0.9", "10.00")).toBe(false);
    expect(exceedsWeightAllowance("1", "0.899", "10.00")).toBe(true);
    expect(exceedsWeightAllowance("1", "1.04", "1.00")).toBe(true);
  });
  it("translates the finalized cash amount without changing its digits", () => {
    const id = "12345678-0000-4000-8000-000000000000";
    expect(
      translateOrderNotification(
        "si",
        "Your order 12345678 is ready for delivery. Final cash-on-delivery amount: LKR 356.40.",
        id,
      ),
    ).toContain("356.40");
    expect(
      translateOrderNotification(
        "si",
        "Your order 12345678 is ready for delivery. Final cash-on-delivery amount: LKR 356.40.",
        id,
      ),
    ).toContain("අවසාන මුදල");
  });
});
