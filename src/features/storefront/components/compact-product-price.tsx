"use client";

import type { CartProduct } from "@/features/cart/cart-state";
import { useCart } from "@/features/cart/cart-store";
import { calculatePricing } from "@/lib/pricing";
import { firstOrderQuantity } from "@/lib/quantity";
import type { Locale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/text";

export function CompactProductPrice({
  product,
  locale,
}: {
  product: CartProduct;
  locale: Locale;
}) {
  const { items } = useCart();
  const quantity =
    items.find(
      (item) =>
        item.id === product.id &&
        (item.sellingUnit ?? "UNIT") === (product.sellingUnit ?? "UNIT"),
    )?.quantity ?? firstOrderQuantity(product);
  const pricing = calculatePricing(
    product.price,
    quantity,
    product.discountTiers ?? [],
  );
  const unit = translate(locale, product.sellingUnit === "KG" ? "kg" : "unit");
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm tabular-nums">
      <span className="font-semibold text-foreground">
        <span className="sr-only">{translate(locale, "Our price")}: </span>
        LKR {pricing.unitPrice}{" "}
        <span className="font-normal text-muted-foreground">/ {unit}</span>
      </span>
      {pricing.unitPrice !== product.price ? (
        <del className="text-xs text-muted-foreground">
          <span className="sr-only">
            {translate(locale, "Regular price")}:{" "}
          </span>
          LKR {product.price}
        </del>
      ) : null}
    </div>
  );
}
