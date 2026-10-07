"use client";

import { useState } from "react";

import { useCart } from "@/features/cart/cart-store";
import type { CartProduct } from "@/features/cart/cart-state";
import { getDictionary, type Locale } from "@/lib/i18n/config";

export function AddToCartButton({
  product,
  locale = "en",
  className = "rounded-xl bg-emerald-950 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-neutral-300",
}: {
  product: CartProduct;
  locale?: Locale;
  className?: string;
}) {
  const { add } = useCart();
  const [message, setMessage] = useState<string>();
  const outOfStock = product.stockQuantity === 0;
  const copy = getDictionary(locale).storefront;

  function handleAdd() {
    const added = add(product);
    setMessage(added ? copy.addedToCart : copy.maximumInCart);
  }

  return (
    <div className="text-right">
      <button
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
      </button>
      <p className="mt-1 min-h-4 text-xs text-neutral-500" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
