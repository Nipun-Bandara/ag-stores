import Link from "next/link";

import {
  orderStatusLabels,
  formatOrderDate,
} from "@/features/orders/order-presentation";
import type { getOwnerOrderDashboard } from "@/services/owner-order.service";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type Dashboard = Awaited<ReturnType<typeof getOwnerOrderDashboard>>;

export function OwnerOrderList({ orders }: { orders: Dashboard["orders"] }) {
  if (orders.length === 0) {
    return (
      <Card className="gap-0 mt-6 border-dashed p-10 text-center text-muted-foreground border ring-0">
        No orders match these filters.
      </Card>
    );
  }

  return (
    <div className="mt-6 grid gap-4">
      {orders.map((order) => (
        <Card
          as="article"
          key={order.id}
          data-testid="owner-order-card"
          className="gap-0 p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Order number
              </p>
              <p className="mt-1 break-all font-mono text-sm font-semibold">
                {order.id}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {order.customer.name} · {order.itemCount} item
                {order.itemCount === 1 ? "" : "s"} · {order.shopName}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatOrderDate(order.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <Badge variant="secondary">
                {orderStatusLabels[order.status]}
              </Badge>
              <p className="mt-2 font-semibold">LKR {order.total}</p>
            </div>
          </div>
          <Link
            href={`/owner/orders/${order.id}`}
            className={buttonVariants({
              variant: "outline",
              className: "mt-4 inline-flex",
            })}
          >
            View order
          </Link>
        </Card>
      ))}
    </div>
  );
}
