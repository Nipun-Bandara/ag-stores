import {
  moneyToMinorUnits,
  minorUnitsToMoney,
  multiplyMinorUnits,
} from "@/lib/money";
import { quantityMilli, quantityValid, type SellingUnit } from "@/lib/quantity";

export interface DiscountTier {
  minimumQuantity: number;
  discountAmount: string;
}
export interface PricingSetup {
  sellingUnit?: SellingUnit;
  minimumOrderQuantity?: number | string | { toString(): string };
  orderingIncrement?: number | string | { toString(): string };
}
export class PricingConfigurationError extends Error {}

/** Validate the entire resulting configuration, including retained tiers on price-only edits. */
export function validatePricing(
  regularPrice: string,
  tiers: readonly DiscountTier[],
  setup: PricingSetup,
): void {
  if (tiers.length > 4)
    throw new PricingConfigurationError(
      "A product can have at most four discount tiers.",
    );
  const regular = BigInt(moneyToMinorUnits(regularPrice));
  let previousThreshold = BigInt(0);
  let previousDiscount = BigInt(0);
  for (const tier of tiers) {
    if (!quantityValid(tier.minimumQuantity, setup))
      throw new PricingConfigurationError(
        "Tier quantities must follow the product quantity rules.",
      );
    const threshold = quantityMilli(tier.minimumQuantity);
    if (threshold <= previousThreshold)
      throw new PricingConfigurationError(
        "Tier quantities must be unique and strictly increasing.",
      );
    const discount = BigInt(moneyToMinorUnits(tier.discountAmount));
    if (discount > regular)
      throw new PricingConfigurationError(
        "A tier discount cannot exceed the regular price.",
      );
    if (discount < previousDiscount)
      throw new PricingConfigurationError(
        "Discounts cannot decrease as tier quantities rise.",
      );
    previousThreshold = threshold;
    previousDiscount = discount;
  }
}

/** One qualifying tier applies to the entire requested quantity; all money is integer cents. */
export function calculatePricing(
  regularPrice: string,
  quantity: number,
  tiers: readonly DiscountTier[] = [],
) {
  const amount = quantityMilli(quantity);
  const regular = BigInt(moneyToMinorUnits(regularPrice));
  let discount = BigInt(0);
  let threshold = BigInt(0);
  for (const tier of tiers) {
    const minimum = quantityMilli(tier.minimumQuantity);
    if (minimum <= amount && minimum > threshold) {
      threshold = minimum;
      discount = BigInt(moneyToMinorUnits(tier.discountAmount));
    }
  }
  if (discount > regular)
    throw new PricingConfigurationError(
      "A tier discount cannot exceed the regular price.",
    );
  const unitPrice = minorUnitsToMoney((regular - discount).toString());
  const regularLineMinor = multiplyMinorUnits(regular.toString(), quantity);
  const lineMinor = multiplyMinorUnits(
    (regular - discount).toString(),
    quantity,
  );
  return {
    regularPrice,
    appliedDiscount: minorUnitsToMoney(discount.toString()),
    unitPrice,
    regularLineTotal: minorUnitsToMoney(regularLineMinor),
    lineTotal: minorUnitsToMoney(lineMinor),
    // Savings reconcile with rounded totals, including fractional-cent KG lines.
    savings: minorUnitsToMoney(
      (BigInt(regularLineMinor) - BigInt(lineMinor)).toString(),
    ),
  };
}

export function tierViews(
  tiers: readonly {
    minimumQuantity: { toString(): string } | number;
    discountAmount: { toFixed(places: number): string };
  }[],
): DiscountTier[] {
  return tiers.map((tier) => ({
    minimumQuantity: Number(tier.minimumQuantity),
    discountAmount: tier.discountAmount.toFixed(2),
  }));
}

/** Legacy items have no verified regular price or discount; never infer them from today's catalogue. */
export function orderPricingSnapshot(item: {
  regularPrice: { toFixed(places: number): string } | null;
  appliedDiscount: { toFixed(places: number): string } | null;
  unitPrice: { toFixed(places: number): string };
  quantity: { toString(): string } | number;
}) {
  const quantity = Number(item.quantity);
  const unitPrice = item.unitPrice.toFixed(2);
  const lineTotal = minorUnitsToMoney(
    multiplyMinorUnits(moneyToMinorUnits(unitPrice), quantity),
  );
  if (item.regularPrice === null || item.appliedDiscount === null)
    return {
      regularPrice: null,
      appliedDiscount: null,
      unitPrice,
      lineTotal,
      savings: null,
    };
  const regularPrice = item.regularPrice.toFixed(2);
  const regularLine = multiplyMinorUnits(
    moneyToMinorUnits(regularPrice),
    quantity,
  );
  return {
    regularPrice,
    appliedDiscount: item.appliedDiscount.toFixed(2),
    unitPrice,
    lineTotal,
    savings: minorUnitsToMoney(
      (BigInt(regularLine) - BigInt(moneyToMinorUnits(lineTotal))).toString(),
    ),
  };
}
