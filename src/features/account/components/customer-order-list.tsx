import { CountNoun } from "@/features/i18n/components/count-noun";
import { DateText } from "@/features/i18n/components/date-text";
import { Text } from "@/features/i18n/components/text";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { orderStatusLabels } from "@/features/orders/order-presentation";
import type { listCustomerOrders } from "@/services/customer-order.service";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type CustomerOrders = Awaited<ReturnType<typeof listCustomerOrders>>;
type CustomerOrderSummary = CustomerOrders["activeOrders"][number];

function OrderCard({ order }: { order: CustomerOrderSummary }) {
  return (
    <Card
      as="article"
      data-testid="customer-order-card"
      className="min-w-0 gap-0 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="break-words font-semibold">{order.shopName}</h3>
          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
            {order.id}
          </p>
        </div>
        <div className="max-w-1/2 text-right">
          <Badge variant="success" className="max-w-full whitespace-normal">
            <Text value={orderStatusLabels[order.status]} />
          </Badge>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-sm text-muted-foreground">
          {order.itemCount}{" "}
          <CountNoun count={order.itemCount} singular="item" plural="items" />
        </p>
        <p className="font-semibold tabular-nums">LKR {order.total}</p>
      </div>
      <div className="mt-auto flex items-end justify-between gap-3 pt-3">
        <div className="min-w-0 text-xs text-muted-foreground">
          <p>
            <Text value="Ordered" /> <DateText value={order.createdAt} />
          </p>
          {order.updatedAt !== order.createdAt ? (
            <p className="mt-1">
              <Text value="Updated " />
              <DateText value={order.updatedAt} />
            </p>
          ) : null}
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href={`/account/orders/${order.id}`}
                className={buttonVariants({
                  variant: "outline",
                  size: "icon",
                  className: "shrink-0",
                })}
              >
                <ArrowUpRight aria-hidden="true" />
                <span className="sr-only">
                  <Text value="View order details" />
                </span>
              </Link>
            }
          />
          <TooltipContent>
            <Text value="View order details" />
          </TooltipContent>
        </Tooltip>
      </div>
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
      className="min-w-0"
      aria-labelledby={`${title.replaceAll(" ", "-").toLowerCase()}-heading`}
    >
      <div className="flex items-center gap-2">
        <h2
          id={`${title.replaceAll(" ", "-").toLowerCase()}-heading`}
          className="text-xl font-semibold"
        >
          <Text value={title} />
        </h2>
        <Badge variant="secondary">{orders.length}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        <Text value={description} />
      </p>
      {orders.length ? (
        <div className="mt-3 grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <Empty className="mt-4">
          <EmptyHeader>
            <EmptyTitle>
              <Text value={emptyMessage} />
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  );
}

export function CustomerOrderList({ orders }: { orders: CustomerOrders }) {
  return (
    <div className="mt-6 space-y-6">
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
    </div>
  );
}
