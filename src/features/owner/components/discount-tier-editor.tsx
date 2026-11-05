"use client";
import { quantityValid } from "@/lib/quantity";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Label } from "@/components/ui/label";
import { useId } from "react";
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
  const exampleId = useId();
  const exampleSchema = Yup.object({
    exampleQuantity: Yup.string()
      .required(t("Enter a valid example quantity."))
      .test("quantity", t("Enter a valid example quantity."), (value) =>
        Boolean(
          value &&
          /^\d+(?:\.\d{1,3})?$/.test(value) &&
          quantityValid(value, setup),
        ),
      ),
  });
  const exampleForm = useFormik({
    initialValues: { exampleQuantity: "1" },
    validationSchema: exampleSchema,
    onSubmit: () => {},
  });
  const { exampleQuantity } = exampleForm.values;
  const exampleValid = exampleSchema.isValidSync(exampleForm.values);
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
      className="space-y-3 rounded-lg border border-border p-4 sm:col-span-6 lg:col-span-12"
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
          <label className="flex min-w-0 flex-col gap-2 text-sm">
            {t("Tier minimum quantity")} {index + 1}
            <Input
              aria-label={`${t("Tier minimum quantity")} ${index + 1}`}
              className="h-10"
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
          <label className="flex min-w-0 flex-col gap-2 text-sm">
            {t("Discount per unit/kg (LKR)")} {index + 1}
            <Input
              aria-label={`${t("Discount per unit/kg (LKR)")} ${index + 1}`}
              className="h-10"
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
            className="h-10 self-end"
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
        <div className="space-y-2 border-t border-border pt-3">
          <h3 className="font-medium">{t("Live price example")}</h3>
          <div className="grid min-w-0 items-start gap-4 md:grid-cols-[minmax(10rem,1fr)_minmax(0,3fr)]">
            <div className="min-w-0 space-y-2">
              <Label htmlFor={exampleId} className="block text-sm font-medium">
                {t("Example quantity")}
              </Label>
              <Input
                id={exampleId}
                className="h-10 w-full"
                type="number"
                {...exampleForm.getFieldProps("exampleQuantity")}
                onChange={(event) => {
                  void exampleForm.setFieldValue(
                    "exampleQuantity",
                    event.currentTarget.value,
                  );
                }}
                min={setup.sellingUnit === "KG" ? "0.002" : "1"}
                step={setup.sellingUnit === "KG" ? "0.001" : "1"}
                aria-invalid={!exampleValid}
                aria-describedby={
                  !exampleValid ? `${exampleId}-error` : undefined
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void exampleForm.setFieldTouched("exampleQuantity", true);
                  }
                }}
              />
              {!exampleValid ? (
                <p
                  id={`${exampleId}-error`}
                  className="text-sm text-destructive"
                >
                  {t("Enter a valid example quantity.")}
                </p>
              ) : null}
            </div>
            <div className="min-w-0" aria-live="polite">
              {exampleValid ? (
                <ProductPrice
                  regularPrice={validated.price}
                  quantity={Number(exampleQuantity)}
                  discountTiers={validated.tiers}
                  sellingUnit={setup.sellingUnit ?? "UNIT"}
                  locale={locale}
                  layout="grid"
                  showLine
                  separateLineItems
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
