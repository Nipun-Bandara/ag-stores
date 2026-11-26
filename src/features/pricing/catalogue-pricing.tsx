"use client";
import { useCart } from "@/features/cart/cart-store";
import { firstOrderQuantity } from "@/lib/quantity";
import type { CartProduct } from "@/features/cart/cart-state";
import { translate } from "@/lib/i18n/text";
import type { Locale } from "@/lib/i18n/config";
import { ProductPrice } from "./price-display";

export function CataloguePricing({
  product,
  locale,
}: {
  product: CartProduct;
  locale: Locale;
}) {
  const { items } = useCart();
  const selected = items.find(
    (item) =>
      item.id === product.id &&
      (item.sellingUnit ?? "UNIT") === (product.sellingUnit ?? "UNIT"),
  );
  const quantity = selected?.quantity ?? firstOrderQuantity(product);
  return (
    <div>
      <p className="mb-1 text-xs text-muted-foreground">
        {translate(locale, "Price for {quantity} {unit}", {
          quantity,
          unit: translate(
            locale,
            product.sellingUnit === "KG"
              ? "kg"
              : quantity === 1
                ? "unit"
                : "units",
          ),
        })}
      </p>
      <ProductPrice
        regularPrice={product.price}
        quantity={quantity}
        discountTiers={product.discountTiers ?? []}
        sellingUnit={product.sellingUnit ?? "UNIT"}
        locale={locale}
        showLine={!!selected}
        separateLineItems
      />
    </div>
  );
}
