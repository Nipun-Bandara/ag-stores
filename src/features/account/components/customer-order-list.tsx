import { CountNoun } from "@/features/i18n/components/count-noun";
import { DateText } from "@/features/i18n/components/date-text";
import { Text } from "@/features/i18n/components/text";
import Link from "next/link";

import { orderStatusLabels } from "@/features/orders/order-presentation";
import type { listCustomerOrders } from "@/services/customer-order.service";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type CustomerOrders = Awaited<ReturnType<typeof listCustomerOrders>>;
type CustomerOrderSummary = CustomerOrders["activeOrders"][number];

function OrderCard({ order }: { order: CustomerOrderSummary }) {
  return (
    <Card as="article" data-testid="customer-order-card" className="gap-0 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {order.shopName}
          </p>
          <p className="mt-1 break-all font-mono text-sm font-semibold">
            {order.id}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {order.itemCount}{" "}
            <CountNoun count={order.itemCount} singular="item" plural="items" />{" "}
            <Text value={"· Ordered"} /> <DateText value={order.createdAt} />
          </p>
          {order.updatedAt !== order.createdAt ? (
            <p className="mt-1 text-xs text-muted-foreground">
              <Text value={"Updated "} />
              <DateText value={order.updatedAt} />
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <Badge variant="success">
            <Text value={orderStatusLabels[order.status]} />
          </Badge>
          <p className="mt-2 font-semibold">LKR {order.total}</p>
        </div>
      </div>
      <Link
        href={`/account/orders/${order.id}`}
        className={buttonVariants({
          variant: "outline",
          className: "mt-4 inline-flex",
        })}
      >
        <Text value={"View order details "} />
      </Link>
    </Card>
  );
}

function OrderSection({
  title,
  description,
  orders,
  emptyMessage,
}: {
  title: string;
  description: string;
  orders: CustomerOrderSummary[];
  emptyMessage: string;
}) {
  return (
    <section
      className="mt-8"
      aria-labelledby={`${title.replaceAll(" ", "-").toLowerCase()}-heading`}
    >
      <h2
        id={`${title.replaceAll(" ", "-").toLowerCase()}-heading`}
        className="text-xl font-semibold"
      >
        <Text value={title} />
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        <Text value={description} />
      </p>
      {orders.length ? (
        <div className="mt-4 grid gap-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <Card className="gap-0 mt-4 border-dashed p-8 text-center text-muted-foreground border ring-0">
          <Text value={emptyMessage} />
        </Card>
      )}
    </section>
  );
}

export function CustomerOrderList({ orders }: { orders: CustomerOrders }) {
  return (
    <>
      <OrderSection
        title="Active orders"
        description="Orders that are being confirmed, prepared, assigned, or delivered."
        orders={orders.activeOrders}
        emptyMessage="You have no active orders."
      />
      <OrderSection
        title="Order history"
        description="Delivered, cancelled, rejected, and failed delivery orders."
        orders={orders.orderHistory}
        emptyMessage="Your completed order history is empty."
      />
    </>
  );
}
