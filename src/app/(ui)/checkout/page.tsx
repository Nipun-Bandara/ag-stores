import type { Metadata } from "next";

import { CheckoutView } from "@/features/checkout/components/checkout-view";
import { UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/server";
import { listCustomerAddresses } from "@/services/customer-address.service";

export const metadata: Metadata = { title: "Checkout | AG Stores" };

export default async function CheckoutPage() {
  const user = await requireRole(UserRole.CUSTOMER, "/checkout");
  const addresses = await listCustomerAddresses(user);

  return (
    <section className="min-w-0 w-full">
      <p className="text-sm font-bold text-emerald-700">Cash on Delivery</p>
      <h1 className="mt-1 text-4xl font-black tracking-tight text-foreground">
        Checkout
      </h1>
      <div className="mt-8">
        <CheckoutView addresses={addresses} />
      </div>
    </section>
  );
}
