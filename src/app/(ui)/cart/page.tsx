import type { Metadata } from "next";

import { CartView } from "@/features/cart/components/cart-view";

export const metadata: Metadata = { title: "Cart | AG Stores" };

export default function CartPage() {
  return (
    <section className="min-w-0 w-full">
      <p className="text-sm font-bold text-emerald-700">Customer account</p>
      <h1 className="mt-1 text-4xl font-black tracking-tight text-foreground">
        Your cart
      </h1>
      <div className="mt-8">
        <CartView />
      </div>
    </section>
  );
}
