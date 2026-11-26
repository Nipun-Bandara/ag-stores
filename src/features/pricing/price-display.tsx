import { cn } from "@/lib/utils";
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
  layout = "stacked",
  separateLineItems = false,
}: {
  pricing: PriceSummaryValue;
  sellingUnit?: SellingUnit;
  locale?: Locale;
  showLine?: boolean;
  layout?: "stacked" | "grid";
  separateLineItems?: boolean;
}) {
  const t = (text: string) => translate(locale, text);
  const unit = t(sellingUnit === "KG" ? "kg" : "unit");
  return (
    <div
      className={cn(
        "min-w-0 text-sm tabular-nums",
        layout === "grid"
          ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
          : "space-y-1",
      )}
    >
      {pricing.regularPrice !== null ? (
        <p
          className={cn(
            "text-muted-foreground",
            layout === "grid" && "rounded-lg bg-muted/40 p-3",
          )}
        >
          {t("Regular price")}: LKR {pricing.regularPrice} / {unit}
        </p>
      ) : null}
      <p
        className={cn(
          "font-semibold",
          layout === "grid" && "rounded-lg bg-muted/40 p-3",
        )}
      >
        {t("Our price")}: LKR {pricing.unitPrice} / {unit}
      </p>
      {pricing.appliedDiscount !== null ? (
        <p
          className={cn(
            "text-emerald-700 dark:text-emerald-400",
            layout === "grid" && "rounded-lg bg-muted/40 p-3",
          )}
        >
          {t("Savings")}: LKR {pricing.appliedDiscount} / {unit}
        </p>
      ) : null}
      {showLine && separateLineItems ? (
        layout === "grid" ? (
          <>
            <p className="rounded-lg bg-muted/40 p-3">
              {t("Line total")}: LKR {pricing.lineTotal}
            </p>
            {pricing.savings !== null ? (
              <p className="rounded-lg bg-muted/40 p-3">
                {t("Line savings")}: LKR {pricing.savings}
              </p>
            ) : null}
          </>
        ) : (
          <div className="space-y-1 pt-3">
            <p>
              {t("Line total")}: LKR {pricing.lineTotal}
            </p>
            {pricing.savings !== null ? (
              <p>
                {t("Line savings")}: LKR {pricing.savings}
              </p>
            ) : null}
          </div>
        )
      ) : showLine ? (
        <p
          className={
            layout === "grid"
              ? "rounded-lg bg-muted/40 p-3 sm:col-span-2 xl:col-span-3"
              : undefined
          }
        >
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
  layout = "stacked",
  separateLineItems = false,
}: {
  regularPrice: string;
  quantity: number;
  discountTiers?: readonly DiscountTier[];
  sellingUnit?: SellingUnit;
  locale?: Locale;
  showLine?: boolean;
  showOffers?: boolean;
  layout?: "stacked" | "grid";
  separateLineItems?: boolean;
}) {
  const t = (text: string) => translate(locale, text);
  return (
    <div>
      <PriceSummary
        pricing={calculatePricing(regularPrice, quantity, discountTiers)}
        sellingUnit={sellingUnit}
        locale={locale}
        showLine={showLine}
        layout={layout}
        separateLineItems={separateLineItems}
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
