import { expect, it } from "vitest";
import { displayWeight, weightToKilograms } from "@/lib/quantity";
it.each([
  ["2", 0.002],
  ["250", 0.25],
  ["1000", 1],
  ["2147483647000", 2147483647],
] as const)("converts %s g exactly to %s kg and back", (grams, kilograms) => {
  expect(weightToKilograms(grams, "g")).toBe(kilograms);
  expect(displayWeight(kilograms, "g")).toBe(grams);
});
it.each(["2.5", "-2", "2147483647001", "not-a-weight"])(
  "rejects unsupported gram amount %s",
  (value) => expect(() => weightToKilograms(value, "g")).toThrow(),
);
it("retains the three-decimal kilogram precision limit", () => {
  expect(weightToKilograms("0.003", "kg")).toBe(0.003);
  expect(() => weightToKilograms("0.0021", "kg")).toThrow();
});
