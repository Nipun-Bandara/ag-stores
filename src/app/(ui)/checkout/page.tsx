import { getServerText } from "@/lib/i18n/server";
import { Text } from "@/features/i18n/components/text";
import type { Metadata } from "next";

import { CheckoutView } from "@/features/checkout/components/checkout-view";
import { UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/server";
import { listCustomerAddresses } from "@/services/customer-address.service";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Checkout")} | AG Stores` };
}

export default async function CheckoutPage() {
  const user = await requireRole(UserRole.CUSTOMER, "/checkout");
  const addresses = await listCustomerAddresses(user);

  return (
    <section className="min-w-0 w-full">
      <p className="text-sm font-bold text-emerald-700">
        <Text value={"Cash on Delivery"} />
      </p>
      <h1 className="mt-1 text-4xl font-black tracking-tight text-foreground">
        <Text value={"Checkout "} />
      </h1>
      <div className="mt-8">
        <CheckoutView addresses={addresses} />
      </div>
    </section>
  );
}
