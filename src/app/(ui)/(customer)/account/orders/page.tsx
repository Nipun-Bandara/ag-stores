import { getServerText } from "@/lib/i18n/server";
import { Text } from "@/features/i18n/components/text";
import type { Metadata } from "next";

import { UserRole } from "@/generated/prisma/client";
import { CustomerOrderList } from "@/features/account/components/customer-order-list";
import { requireRole } from "@/lib/auth/server";
import { listCustomerOrders } from "@/services/customer-order.service";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Your orders")} | AG Stores` };
}

export default async function CustomerOrdersPage() {
  const user = await requireRole(UserRole.CUSTOMER, "/account/orders");
  const orders = await listCustomerOrders(user);

  return (
    <section className="min-w-0 w-full">
      <h1 className="text-3xl font-semibold tracking-tight">
        <Text value={"Your orders"} />
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <Text
          value={
            "Follow active deliveries and review your previous purchases. "
          }
        />
      </p>
      <CustomerOrderList orders={orders} />
    </section>
  );
}
