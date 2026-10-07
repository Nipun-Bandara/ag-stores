"use client";

import Link from "next/link";

import { useCart } from "@/features/cart/cart-store";
import { routePath, type Locale } from "@/lib/i18n/config";

export function CartNavigationLink({
  locale = "en",
  localizedRoute = false,
  cartLabel = "Cart",
  itemLabel = "item",
  itemsLabel = "items",
  withLabel = "with",
}: {
  locale?: Locale;
  localizedRoute?: boolean;
  cartLabel?: string;
  itemLabel?: string;
  itemsLabel?: string;
  withLabel?: string;
}) {
  const { itemCount } = useCart();

  return (
    <Link
      href={routePath("/cart", locale, localizedRoute)}
      className="rounded-full border border-emerald-950/15 px-3 py-2 font-semibold text-emerald-950"
      aria-label={`${cartLabel} ${withLabel} ${itemCount} ${itemCount === 1 ? itemLabel : itemsLabel}`}
    >
      {cartLabel}
      {itemCount > 0 ? ` (${itemCount})` : ""}
    </Link>
  );
}
