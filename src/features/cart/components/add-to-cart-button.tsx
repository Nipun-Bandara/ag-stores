"use client";

import { stepQuantity, firstOrderQuantity } from "@/lib/quantity";
import Link from "next/link";
import { WeightCartDialog } from "./weight-cart-dialog";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";

import { useCart } from "@/features/cart/cart-store";
import type { CartProduct } from "@/features/cart/cart-state";
import { getDictionary, routePath, type Locale } from "@/lib/i18n/config";
import { Button } from "@/components/ui/button";
import { IconActionButton } from "@/components/ui/icon-action-button";
import { translate } from "@/lib/i18n/text";
import { WeightCartControl } from "@/features/cart/components/weight-cart-control";

export function AddToCartButton({
  product,
  locale = "en",
  className = "",
  compact = false,
  localizedRoute = false,
}: {
  product: CartProduct;
  locale?: Locale;
  className?: string;
  compact?: boolean;
  localizedRoute?: boolean;
}) {
  const { items, add, updateQuantity, remove } = useCart();
  const [message, setMessage] = useState<string>();
  const [weightUnit, setWeightUnit] = useState<"kg" | "g">("kg");
  const outOfStock = product.stockQuantity < firstOrderQuantity(product);
  const copy = getDictionary(locale).storefront;
  const cartItem = items.find((item) => item.id === product.id);
  const quantity = cartItem?.quantity ?? 0;
  const setupChanged =
    !!cartItem &&
    (cartItem.sellingUnit ?? "UNIT") !== (product.sellingUnit ?? "UNIT");
  if (setupChanged)
    return (
      <Link
        className="inline-flex min-h-9 items-center rounded-lg bg-background px-2 text-xs text-primary underline-offset-4 hover:underline"
        href={routePath("/cart", locale, localizedRoute)}
      >
        {translate(
          locale,
          compact
            ? "Review cart"
            : "Product selling setup changed. Review your cart quantity and unit.",
        )}
      </Link>
    );

  function handleAdd() {
    const added = add(product);
    setMessage(added ? copy.addedToCart : copy.maximumInCart);
  }

  if (product.sellingUnit === "KG") {
    if (compact)
      return (
        <WeightCartDialog
          product={product}
          quantity={quantity}
          locale={locale}
        />
      );
    return (
      <WeightCartControl
        key={`${product.id}:${quantity}`}
        product={product}
        quantity={quantity}
        locale={locale}
        unit={weightUnit}
        onUnitChange={setWeightUnit}
      />
    );
  }

  if (compact) {
    if (quantity === 0)
      return (
        <IconActionButton
          type="button"
          variant="outline"
          label={translate(locale, "Add {name} to cart", {
            name: product.name,
          })}
          disabled={outOfStock}
          onClick={handleAdd}
        >
          <Plus aria-hidden="true" />
        </IconActionButton>
      );
    return (
      <div className="flex shrink-0 items-center gap-0 rounded-lg border border-border bg-background p-0.5">
        <IconActionButton
          size="icon-sm"
          type="button"
          variant="ghost"
          label={translate(locale, "Reduce quantity of {name}", {
            name: product.name,
          })}
          disabled={quantity === 0}
          onClick={() => {
            if (quantity <= firstOrderQuantity(product)) remove(product.id);
            else
              updateQuantity(
                product.id,
                stepQuantity(quantity, product.orderingIncrement ?? 1, -1),
              );
          }}
        >
          <Minus aria-hidden="true" />
        </IconActionButton>
        <span
          className="min-w-6 text-center text-sm font-semibold tabular-nums"
          aria-live="polite"
        >
          {quantity}
        </span>
        <IconActionButton
          size="icon-sm"
          type="button"
          variant="success"
          label={
            locale === "en"
              ? `Add ${product.name} to cart`
              : `${copy.addToCart}: ${product.name}`
          }
          disabled={
            outOfStock ||
            stepQuantity(
              quantity,
              quantity === 0
                ? firstOrderQuantity(product)
                : (product.orderingIncrement ?? 1),
            ) > product.stockQuantity
          }
          onClick={handleAdd}
        >
          <Plus aria-hidden="true" />
        </IconActionButton>
        <span className="sr-only" aria-live="polite">
          {message}
        </span>
      </div>
    );
  }

  return (
    <div className="text-right">
      <Button
        variant="success"
        type="button"
        onClick={handleAdd}
        disabled={outOfStock}
        className={className}
        aria-label={
          locale === "en"
            ? `Add ${product.name} to cart`
            : `${copy.addToCart}: ${product.name}`
        }
      >
        {outOfStock ? copy.outOfStock : copy.addToCart}
      </Button>
      <p
        className="mt-1 min-h-4 text-xs text-muted-foreground"
        aria-live="polite"
      >
        {message}
      </p>
    </div>
  );
}
