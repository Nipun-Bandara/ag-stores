import { expect, it } from "vitest";

import { shuffled } from "@/lib/shuffle";

it("returns every item once in a new order without changing the input", () => {
  const items = [1, 2, 3, 4, 5];
  // A fixed sequence makes the order predictable for the assertion.
  const sequence = [0.1, 0.9, 0.5, 0.3];
  const result = shuffled(items, () => sequence.shift() ?? 0);
  expect(result).not.toEqual(items);
  expect([...result].sort()).toEqual(items);
  expect(items).toEqual([1, 2, 3, 4, 5]);
  expect(shuffled([])).toEqual([]);
});
