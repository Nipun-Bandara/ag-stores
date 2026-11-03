"use client";

import Link from "next/link";
import { ArrowRight, ShoppingCart } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCartQuote } from "@/features/cart/use-cart-quote";
import { useCart } from "@/features/cart/cart-store";
import { useText } from "@/features/i18n/components/locale-provider";
import { routePath, type Locale } from "@/lib/i18n/config";

export function StorefrontCartSummary({
  locale,
  localizedRoute,
}: {
  locale: Locale;
  localizedRoute: boolean;
}) {
  const t = useText();
  const { items, itemCount, subtotal } = useCart();
  const { quote } = useCartQuote(items);

  return (
    <Card
      as="aside"
      aria-label={t("Cart summary")}
      className="sticky top-3 z-20 mt-6 flex-row flex-wrap items-center justify-between gap-3 p-3 shadow-sm sm:p-4"
    >
      <div className="flex min-w-0 items-center gap-3">
        <ShoppingCart aria-hidden="true" className="size-5 shrink-0" />
        <div>
          <p className="font-semibold">{t("Your cart")}</p>
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="flex flex-wrap gap-x-2 text-sm text-muted-foreground"
          >
            <span>
              {t(itemCount === 1 ? "{count} item" : "{count} items", {
                count: itemCount,
              })}
            </span>
            <span className="tabular-nums">
              {t(quote ? "Subtotal" : "Estimated subtotal")}: LKR{" "}
              {quote?.subtotal ?? subtotal}
            </span>
          </p>
        </div>
      </div>
      <Link
        href={routePath("/cart", locale, localizedRoute)}
        className={buttonVariants({ className: "h-10 shrink-0 no-underline" })}
      >
        {t("View cart")}
        <ArrowRight aria-hidden="true" />
      </Link>
    </Card>
  );
}
