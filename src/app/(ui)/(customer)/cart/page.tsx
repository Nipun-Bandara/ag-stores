import { getServerText } from "@/lib/i18n/server";
import { Text } from "@/features/i18n/components/text";
import type { Metadata } from "next";

import { CartView } from "@/features/cart/components/cart-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Cart")} | AG Stores` };
}

export default function CartPage() {
  return (
    <section className="min-w-0 w-full">
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
        <Text value="Your cart" />
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        <Text value="Review the items in your cart and continue to checkout." />
      </p>
      <div className="mt-8">
        <CartView />
      </div>
    </section>
  );
}
