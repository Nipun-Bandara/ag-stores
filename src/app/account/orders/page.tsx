import type { Metadata } from "next";

import { UserRole } from "@/generated/prisma/client";
import { AccountHeader } from "@/features/account/components/account-header";
import { CustomerOrderList } from "@/features/account/components/customer-order-list";
import { requireRole } from "@/lib/auth/server";
import { listCustomerOrders } from "@/services/customer-order.service";

export const metadata: Metadata = { title: "Your orders | AG Stores" };

export default async function CustomerOrdersPage() {
  const user = await requireRole(UserRole.CUSTOMER, "/account/orders");
  const orders = await listCustomerOrders(user);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
      <AccountHeader user={user} />
      <section className="pt-8">
        <h1 className="text-3xl font-semibold tracking-tight">Your orders</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Follow active deliveries and review your previous purchases.
        </p>
        <CustomerOrderList orders={orders} />
      </section>
    </main>
  );
}
