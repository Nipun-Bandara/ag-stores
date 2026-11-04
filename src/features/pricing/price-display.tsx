import { calculatePricing, type DiscountTier } from "@/lib/pricing";
import { type SellingUnit } from "@/lib/quantity";
import { type Locale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/text";

export interface PriceSummaryValue {
  regularPrice: string | null;
  appliedDiscount: string | null;
  unitPrice: string;
  lineTotal: string;
  savings: string | null;
}
export function PriceSummary({
  pricing,
  sellingUnit = "UNIT",
  locale = "en",
  showLine = true,
}: {
  pricing: PriceSummaryValue;
  sellingUnit?: SellingUnit;
  locale?: Locale;
  showLine?: boolean;
}) {
  const t = (text: string) => translate(locale, text);
  const unit = t(sellingUnit === "KG" ? "kg" : "unit");
  return (
    <div className="space-y-1 text-sm tabular-nums">
      {pricing.regularPrice !== null ? (
        <p className="text-muted-foreground">
          {t("Regular price")}: LKR {pricing.regularPrice} / {unit}
        </p>
      ) : null}
      <p className="font-semibold">
        {t("Our price")}: LKR {pricing.unitPrice} / {unit}
      </p>
      {pricing.appliedDiscount !== null ? (
        <p className="text-emerald-700 dark:text-emerald-400">
          {t("Savings")}: LKR {pricing.appliedDiscount} / {unit}
        </p>
      ) : null}
      {showLine ? (
        <p>
          {t("Line total")}: LKR {pricing.lineTotal}
          {pricing.savings !== null ? (
            <>
              {" "}
              · {t("Line savings")}: LKR {pricing.savings}
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
export function ProductPrice({
  regularPrice,
  quantity,
  discountTiers = [],
  sellingUnit = "UNIT",
  locale = "en",
  showLine = false,
  showOffers = true,
}: {
  regularPrice: string;
  quantity: number;
  discountTiers?: readonly DiscountTier[];
  sellingUnit?: SellingUnit;
  locale?: Locale;
  showLine?: boolean;
  showOffers?: boolean;
}) {
  const t = (text: string) => translate(locale, text);
  return (
    <div>
      <PriceSummary
        pricing={calculatePricing(regularPrice, quantity, discountTiers)}
        sellingUnit={sellingUnit}
        locale={locale}
        showLine={showLine}
      />
      {showOffers &&
      discountTiers.some((tier) => tier.minimumQuantity > quantity) ? (
        <div className="mt-2 text-xs text-muted-foreground">
          <p className="font-medium">{t("Higher-quantity offers")}</p>
          <ul>
            {discountTiers
              .filter((tier) => tier.minimumQuantity > quantity)
              .map((tier) => (
                <li key={tier.minimumQuantity}>
                  {translate(
                    locale,
                    "Buy {quantity}+ {unit}: save LKR {discount} per {unit}",
                    {
                      quantity: tier.minimumQuantity,
                      unit: t(sellingUnit === "KG" ? "kg" : "unit"),
                      discount: tier.discountAmount,
                    },
                  )}
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
