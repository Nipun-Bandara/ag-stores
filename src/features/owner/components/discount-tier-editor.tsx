"use client";
import { quantityValid } from "@/lib/quantity";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLocale, useText } from "@/features/i18n/components/locale-provider";
import { ProductPrice } from "@/features/pricing/price-display";
import {
  validatePricing,
  type DiscountTier,
  type PricingSetup,
} from "@/lib/pricing";

export interface TierDraft {
  minimumQuantity: string;
  discountAmount: string;
}
export function pricingDraft(
  regularPrice: string,
  drafts: readonly TierDraft[],
  setup: PricingSetup,
) {
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(regularPrice))
    throw new Error(
      "Enter a valid regular price with up to two decimal places.",
    );
  const money = (value: string) => {
    if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(value))
      throw new Error(
        "Enter a nonnegative discount amount with up to two decimal places.",
      );
    const [whole, fraction = ""] = value.split(".");
    return `${BigInt(whole ?? "0")}.${fraction.padEnd(2, "0")}`;
  };
  const price = money(regularPrice);
  const tiers = drafts.map((tier) => {
    if (!/^\d{1,10}(?:\.\d{1,3})?$/.test(tier.minimumQuantity))
      throw new Error(
        "Tier quantities must follow the product quantity rules.",
      );
    return {
      minimumQuantity: Number(tier.minimumQuantity),
      discountAmount: money(tier.discountAmount),
    };
  });
  validatePricing(price, tiers, setup);
  return { price, tiers };
}
export function DiscountTierEditor({
  regularPrice,
  drafts,
  onChange,
  setup,
}: {
  regularPrice: string;
  drafts: TierDraft[];
  onChange: (tiers: TierDraft[]) => void;
  setup: PricingSetup;
}) {
  const t = useText();
  const locale = useLocale();
  const [exampleQuantity, setExampleQuantity] = useState("1");
  let validated: { price: string; tiers: DiscountTier[] } | undefined;
  let error: string | undefined;
  try {
    validated = pricingDraft(regularPrice, drafts, setup);
  } catch (failure) {
    error =
      failure instanceof Error ? failure.message : "Invalid discount tiers.";
  }
  function update(index: number, field: keyof TierDraft, value: string) {
    onChange(
      drafts.map((tier, i) =>
        i === index ? { ...tier, [field]: value } : tier,
      ),
    );
  }
  return (
    <section
      className="space-y-3 rounded-lg border p-4 sm:col-span-6 lg:col-span-12"
      aria-label={t("Quantity discounts (optional)")}
    >
      <h2 className="font-semibold">{t("Quantity discounts (optional)")}</h2>
      <p className="text-sm text-muted-foreground">
        {t(
          "Add up to four tiers. The highest qualifying tier discounts the entire quantity. Amounts are LKR per unit or kg.",
        )}
      </p>
      {drafts.map((tier, index) => (
        <div key={index} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-sm">
            {t("Tier minimum quantity")} {index + 1}
            <Input
              aria-label={`${t("Tier minimum quantity")} ${index + 1}`}
              type="number"
              min={setup.sellingUnit === "KG" ? "0.002" : "1"}
              step={setup.sellingUnit === "KG" ? "0.001" : "1"}
              value={tier.minimumQuantity}
              onChange={(event) =>
                update(index, "minimumQuantity", event.target.value)
              }
              required
            />
          </label>
          <label className="text-sm">
            {t("Discount per unit/kg (LKR)")} {index + 1}
            <Input
              aria-label={`${t("Discount per unit/kg (LKR)")} ${index + 1}`}
              type="number"
              min="0"
              step="0.01"
              value={tier.discountAmount}
              onChange={(event) =>
                update(index, "discountAmount", event.target.value)
              }
              required
            />
          </label>
          <Button
            type="button"
            variant="outline"
            className="self-end"
            onClick={() => onChange(drafts.filter((_, i) => i !== index))}
            aria-label={t("Remove tier {number}", { number: index + 1 })}
          >
            {t("Remove tier")}
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={drafts.length >= 4}
        onClick={() =>
          onChange([...drafts, { minimumQuantity: "", discountAmount: "" }])
        }
      >
        {t("Add discount tier")}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {t(error)}
        </p>
      ) : null}
      {validated && drafts.length > 0 ? (
        <div className="space-y-2 border-t pt-3">
          <h3 className="font-medium">{t("Live price example")}</h3>
          <label className="block text-sm">
            {t("Example quantity")}
            <Input
              className="mt-1 max-w-40"
              type="number"
              value={exampleQuantity}
              onChange={(event) => setExampleQuantity(event.target.value)}
              min={setup.sellingUnit === "KG" ? "0.002" : "1"}
              step={setup.sellingUnit === "KG" ? "0.001" : "1"}
            />
          </label>
          {/^\d+(?:\.\d{1,3})?$/.test(exampleQuantity) &&
          quantityValid(exampleQuantity, setup) ? (
            <ProductPrice
              regularPrice={validated.price}
              quantity={Number(exampleQuantity)}
              discountTiers={validated.tiers}
              sellingUnit={setup.sellingUnit ?? "UNIT"}
              locale={locale}
              showLine
            />
          ) : (
            <p>{t("Enter a valid example quantity.")}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
