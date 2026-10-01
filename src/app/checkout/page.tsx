import type { Metadata } from "next";

import { CheckoutView } from "@/features/checkout/components/checkout-view";
import { StorefrontHeader } from "@/features/storefront/components/storefront-header";
import { UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/server";
import { listCustomerAddresses } from "@/services/customer-address.service";

export const metadata: Metadata = { title: "Checkout | AG Stores" };

export default async function CheckoutPage() {
  const user = await requireRole(UserRole.CUSTOMER, "/checkout");
  const addresses = await listCustomerAddresses(user);

  return (
    <div className="min-h-screen bg-[#fffdf7]">
      <StorefrontHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <p className="text-sm font-bold text-emerald-700">Cash on Delivery</p>
        <h1 className="mt-1 text-4xl font-black tracking-tight text-emerald-950">
          Checkout
        </h1>
        <div className="mt-8">
          <CheckoutView addresses={addresses} />
        </div>
      </main>
    </div>
  );
}
