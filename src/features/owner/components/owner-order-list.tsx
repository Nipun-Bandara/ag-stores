import Link from "next/link";

import {
  orderStatusLabels,
  formatOrderDate,
} from "@/features/orders/order-presentation";
import type { getOwnerOrderDashboard } from "@/services/owner-order.service";

type Dashboard = Awaited<ReturnType<typeof getOwnerOrderDashboard>>;

export function OwnerOrderList({ orders }: { orders: Dashboard["orders"] }) {
  if (orders.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-dashed p-10 text-center text-sm text-neutral-600">
        No orders match these filters.
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-4">
      {orders.map((order) => (
        <article
          key={order.id}
          data-testid="owner-order-card"
          className="rounded-xl border bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                Order number
              </p>
              <p className="mt-1 break-all font-mono text-sm font-semibold">
                {order.id}
              </p>
              <p className="mt-2 text-sm text-neutral-600">
                {order.customer.name} · {order.itemCount} item
                {order.itemCount === 1 ? "" : "s"} · {order.shopName}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {formatOrderDate(order.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold">
                {orderStatusLabels[order.status]}
              </span>
              <p className="mt-2 font-semibold">LKR {order.total}</p>
            </div>
          </div>
          <Link
            href={`/owner/orders/${order.id}`}
            className="mt-4 inline-flex rounded-md border px-4 py-2 text-sm font-medium"
          >
            View order
          </Link>
        </article>
      ))}
    </div>
  );
}
