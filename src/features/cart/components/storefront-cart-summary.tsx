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
  const { quote } = useCartQuote(items, "products");

  if (!items.length) return null;

  return (
    <Card
      as="aside"
      aria-label={t("Cart summary")}
      className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-30 flex-row items-center justify-between gap-3 rounded-xl border border-border p-3 shadow-lg ring-0 md:sticky md:inset-x-auto md:bottom-auto md:top-3 md:z-20 md:mt-5 md:w-full md:shadow-sm"
    >
      <div className="flex min-w-0 items-center gap-3">
        <ShoppingCart aria-hidden="true" className="size-5 shrink-0" />
        <div>
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="flex flex-col gap-0.5 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-3"
          >
            <span>
              {t(itemCount === 1 ? "{count} item" : "{count} items", {
                count: itemCount,
              })}
            </span>
            <span className="text-sm font-semibold text-foreground tabular-nums">
              {t(quote ? "Subtotal" : "Estimated subtotal")}: LKR{" "}
              {quote?.subtotal ?? subtotal}
            </span>
          </p>
        </div>
      </div>
      <Link
        href={routePath("/cart", locale, localizedRoute)}
        className={buttonVariants({
          variant: "success",
          className:
            "h-auto min-h-10 max-w-[45%] shrink-0 whitespace-normal break-words px-3 py-2 text-center no-underline",
        })}
      >
        {t("View cart")}
        <ArrowRight aria-hidden="true" />
      </Link>
    </Card>
  );
}
