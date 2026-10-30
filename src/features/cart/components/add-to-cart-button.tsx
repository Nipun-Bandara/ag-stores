"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

import { useCart } from "@/features/cart/cart-store";
import type { CartProduct } from "@/features/cart/cart-state";
import { getDictionary, type Locale } from "@/lib/i18n/config";
import { Button } from "@/components/ui/button";
import { IconActionButton } from "@/components/ui/icon-action-button";
import { translate } from "@/lib/i18n/text";

export function AddToCartButton({
  product,
  locale = "en",
  className = "",
  compact = false,
}: {
  product: CartProduct;
  locale?: Locale;
  className?: string;
  compact?: boolean;
}) {
  const { items, add, updateQuantity, remove } = useCart();
  const [message, setMessage] = useState<string>();
  const outOfStock = product.stockQuantity === 0;
  const copy = getDictionary(locale).storefront;
  const quantity = items.find((item) => item.id === product.id)?.quantity ?? 0;

  function handleAdd() {
    const added = add(product);
    setMessage(added ? copy.addedToCart : copy.maximumInCart);
  }

  if (compact) {
    return (
      <div className="flex shrink-0 items-center gap-1 rounded-lg bg-muted/50 p-1">
        <IconActionButton
          type="button"
          variant="ghost"
          label={translate(locale, "Remove one {name} from cart", {
            name: product.name,
          })}
          disabled={quantity === 0}
          onClick={() => {
            if (quantity === 1) remove(product.id);
            else updateQuantity(product.id, quantity - 1);
          }}
        >
          <Minus aria-hidden="true" />
        </IconActionButton>
        <span
          className="min-w-6 text-center font-semibold tabular-nums"
          aria-live="polite"
        >
          {quantity}
        </span>
        <IconActionButton
          type="button"
          variant="success"
          label={
            locale === "en"
              ? `Add ${product.name} to cart`
              : `${copy.addToCart}: ${product.name}`
          }
          disabled={outOfStock || quantity >= product.stockQuantity}
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
