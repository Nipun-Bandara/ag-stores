import type { Metadata } from "next";

import { CartView } from "@/features/cart/components/cart-view";
import { StorefrontHeader } from "@/features/storefront/components/storefront-header";

export const metadata: Metadata = { title: "Cart | AG Stores" };

export default function CartPage() {
  return (
    <div className="min-h-screen bg-[#fffdf7]">
      <StorefrontHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <p className="text-sm font-bold text-emerald-700">Customer account</p>
        <h1 className="mt-1 text-4xl font-black tracking-tight text-emerald-950">
          Your cart
        </h1>
        <div className="mt-8">
          <CartView />
        </div>
      </main>
    </div>
  );
}
