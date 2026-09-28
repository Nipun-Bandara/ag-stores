"use client";

import { useState } from "react";

import { useCart } from "@/features/cart/cart-store";
import type { CartProduct } from "@/features/cart/cart-state";

export function AddToCartButton({
  product,
  className = "rounded-xl bg-emerald-950 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-neutral-300",
}: {
  product: CartProduct;
  className?: string;
}) {
  const { add } = useCart();
  const [message, setMessage] = useState<string>();
  const outOfStock = product.stockQuantity === 0;

  function handleAdd() {
    const added = add(product);
    setMessage(
      added
        ? "Added to cart"
        : "Maximum available quantity is already in your cart",
    );
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={handleAdd}
        disabled={outOfStock}
        className={className}
        aria-label={`Add ${product.name} to cart`}
      >
        {outOfStock ? "Out of Stock" : "Add to cart"}
      </button>
      <p className="mt-1 min-h-4 text-xs text-neutral-500" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
