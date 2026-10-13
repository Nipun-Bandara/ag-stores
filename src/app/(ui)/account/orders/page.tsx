import type { Metadata } from "next";

import { UserRole } from "@/generated/prisma/client";
import { CustomerOrderList } from "@/features/account/components/customer-order-list";
import { requireRole } from "@/lib/auth/server";
import { listCustomerOrders } from "@/services/customer-order.service";

export const metadata: Metadata = { title: "Your orders | AG Stores" };

export default async function CustomerOrdersPage() {
  const user = await requireRole(UserRole.CUSTOMER, "/account/orders");
  const orders = await listCustomerOrders(user);

  return (
    <section className="min-w-0 w-full">
      <h1 className="text-3xl font-semibold tracking-tight">Your orders</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Follow active deliveries and review your previous purchases.
      </p>
      <CustomerOrderList orders={orders} />
    </section>
  );
}
