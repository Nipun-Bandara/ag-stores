"use client";
import { translate } from "@/lib/i18n/text";

import Link from "next/link";

import { useCart } from "@/features/cart/cart-store";
import { routePath, type Locale } from "@/lib/i18n/config";
import { buttonVariants } from "@/components/ui/button";

export function CartNavigationLink({
  locale = "en",
  localizedRoute = false,
  cartLabel,
  itemLabel,
  itemsLabel,
  withLabel,
}: {
  locale?: Locale;
  localizedRoute?: boolean;
  cartLabel?: string;
  itemLabel?: string;
  itemsLabel?: string;
  withLabel?: string;
}) {
  const { itemCount } = useCart();
  const actualCartLabel = cartLabel ?? translate(locale, "Cart");
  const actualItemLabel = itemLabel ?? translate(locale, "item");
  const actualItemsLabel = itemsLabel ?? translate(locale, "items");
  const actualWithLabel = withLabel ?? translate(locale, "with");

  return (
    <Link
      href={routePath("/cart", locale, localizedRoute)}
      className={buttonVariants({ variant: "outline", className: "" })}
      aria-label={`${actualCartLabel} ${actualWithLabel} ${itemCount} ${itemCount === 1 ? actualItemLabel : actualItemsLabel}`}
    >
      {actualCartLabel}
      {itemCount > 0 ? ` (${itemCount})` : ""}
    </Link>
  );
}
