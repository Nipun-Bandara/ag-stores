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
      <p className="text-sm font-bold text-emerald-700">
        <Text value={"Customer account"} />
      </p>
      <h1 className="mt-1 text-4xl font-black tracking-tight text-foreground">
        <Text value={"Your cart "} />
      </h1>
      <div className="mt-8">
        <CartView />
      </div>
    </section>
  );
}
