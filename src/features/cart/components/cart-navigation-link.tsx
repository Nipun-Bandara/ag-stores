"use client";

import Link from "next/link";

import { useCart } from "@/features/cart/cart-store";

export function CartNavigationLink() {
  const { itemCount } = useCart();

  return (
    <Link
      href="/cart"
      className="rounded-full border border-emerald-950/15 px-3 py-2 font-semibold text-emerald-950"
      aria-label={`Cart with ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
    >
      Cart{itemCount > 0 ? ` (${itemCount})` : ""}
    </Link>
  );
}
