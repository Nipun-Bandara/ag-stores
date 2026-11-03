/** Quantities are represented as thousandths for all arithmetic and validation. */
export type SellingUnit = "UNIT" | "KG";
export const MAX_QUANTITY = 2147483647;

export function quantityMilli(
  value: string | number | { toString(): string },
): bigint {
  const text = String(value);
  if (!/^\d{1,10}(?:\.\d{1,3})?$/.test(text)) {
    throw new Error("Quantity must have at most three decimal places.");
  }
  const [whole, fraction = ""] = text.split(".");
  const result =
    BigInt(whole ?? "0") * BigInt(1000) + BigInt(fraction.padEnd(3, "0"));
  if (result > BigInt(MAX_QUANTITY) * BigInt(1000))
    throw new Error("Quantity is too large.");
  return result;
}

export function quantityNumber(value: bigint): number {
  return Number(
    `${value / BigInt(1000)}.${String(value % BigInt(1000)).padStart(3, "0")}`,
  );
}

export function quantityValid(
  quantity: number | string,
  setup: {
    sellingUnit?: SellingUnit;
    minimumOrderQuantity?: number | string | { toString(): string };
    orderingIncrement?: number | string | { toString(): string };
  },
): boolean {
  try {
    const amount = quantityMilli(quantity);
    const minimum = quantityMilli(
      setup.minimumOrderQuantity ?? (setup.sellingUnit === "KG" ? 0.002 : 1),
    );
    if (amount <= BigInt(0) || minimum <= BigInt(0) || amount < minimum)
      return false;
    if (setup.sellingUnit === "KG") return amount >= BigInt(2);
    const increment = quantityMilli(setup.orderingIncrement ?? 1);
    return (
      increment > BigInt(0) &&
      amount % increment === BigInt(0) &&
      amount % BigInt(1000) === BigInt(0)
    );
  } catch {
    return false;
  }
}

/** Weights start at their minimum; whole units respect their saved setup. */
export function firstOrderQuantity(setup: {
  sellingUnit?: SellingUnit;
  minimumOrderQuantity?: number | string | { toString(): string };
  orderingIncrement?: number | string | { toString(): string };
}): number {
  const minimum = quantityMilli(
    setup.minimumOrderQuantity ?? (setup.sellingUnit === "KG" ? 0.002 : 1),
  );
  if (minimum <= BigInt(0)) throw new Error("Minimum must be positive.");
  if (setup.sellingUnit === "KG")
    return quantityNumber(minimum < BigInt(2) ? BigInt(2) : minimum);
  const increment = quantityMilli(setup.orderingIncrement ?? 1);
  if (increment <= BigInt(0)) throw new Error("Increment must be positive.");
  return quantityNumber(
    ((minimum + increment - BigInt(1)) / increment) * increment,
  );
}

export function stepQuantity(
  quantity: number,
  increment: number,
  direction = 1,
): number {
  return quantityNumber(
    quantityMilli(quantity) + BigInt(direction) * quantityMilli(increment),
  );
}

export class SellingSetupError extends Error {}
