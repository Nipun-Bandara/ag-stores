import { ArrowUpRight } from "lucide-react";
import { CountNoun } from "@/features/i18n/components/count-noun";
import { DateText } from "@/features/i18n/components/date-text";
import { Text } from "@/features/i18n/components/text";
import Link from "next/link";

import { orderStatusLabels } from "@/features/orders/order-presentation";
import type { getOwnerOrderDashboard } from "@/services/owner-order.service";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Dashboard = Awaited<ReturnType<typeof getOwnerOrderDashboard>>;

export function OwnerOrderList({ orders }: { orders: Dashboard["orders"] }) {
  if (orders.length === 0) {
    return (
      <Empty className="mt-6">
        <EmptyHeader>
          <EmptyTitle>
            <Text value={"No orders match these filters. "} />
          </EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="mt-6 grid items-start gap-4 xl:grid-cols-2">
      {orders.map((order) => (
        <Card
          as="article"
          key={order.id}
          data-testid="owner-order-card"
          className="min-w-0 gap-0 p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <Text value={"Order number "} />
              </p>
              <p className="mt-1 break-all font-mono text-sm font-semibold">
                {order.id}
              </p>
            </div>
            <div className="max-w-1/2 shrink-0 text-right">
              <Badge
                variant="secondary"
                className="max-w-full whitespace-normal"
              >
                <Text value={orderStatusLabels[order.status]} />
              </Badge>
              <p className="mt-2 font-semibold">LKR {order.total}</p>
              {order.packingRequired ? (
                <p className="text-xs text-muted-foreground">
                  <Text
                    value={
                      order.packingFinalizedAt
                        ? "Final amount to collect"
                        : "Amount is estimated until packing is finalized"
                    }
                  />
                </p>
              ) : null}
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">
                <Text value="Customer" />
              </dt>
              <dd className="mt-1 break-words font-medium">
                {order.customer.name}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">
                <Text value="Shop" />
              </dt>
              <dd className="mt-1 break-words">{order.shopName}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 text-xs text-muted-foreground">
              <p>
                <DateText value={order.createdAt} />
              </p>
              <p className="mt-1">
                {order.itemCount}{" "}
                <CountNoun
                  count={order.itemCount}
                  singular="item"
                  plural="items"
                />
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href={`/owner/orders/${order.id}`}
                    className={buttonVariants({
                      variant: "outline",
                      size: "icon",
                      className: "shrink-0",
                    })}
                  >
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                    <span className="sr-only">
                      <Text value="View order" />
                    </span>
                  </Link>
                }
              />
              <TooltipContent>
                <Text value="View order" />
              </TooltipContent>
            </Tooltip>
          </div>
        </Card>
      ))}
    </div>
  );
}
