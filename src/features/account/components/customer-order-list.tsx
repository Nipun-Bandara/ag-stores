import Link from "next/link";

import {
  formatOrderDate,
  orderStatusLabels,
} from "@/features/orders/order-presentation";
import type { listCustomerOrders } from "@/services/customer-order.service";

type CustomerOrders = Awaited<ReturnType<typeof listCustomerOrders>>;
type CustomerOrderSummary = CustomerOrders["activeOrders"][number];

function OrderCard({ order }: { order: CustomerOrderSummary }) {
  return (
    <article
      data-testid="customer-order-card"
      className="rounded-xl border bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            {order.shopName}
          </p>
          <p className="mt-1 break-all font-mono text-sm font-semibold">
            {order.id}
          </p>
          <p className="mt-2 text-sm text-neutral-600">
            {order.itemCount} item{order.itemCount === 1 ? "" : "s"} · Ordered{" "}
            {formatOrderDate(order.createdAt)}
          </p>
          {order.updatedAt !== order.createdAt ? (
            <p className="mt-1 text-xs text-neutral-500">
              Updated {formatOrderDate(order.updatedAt)}
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
            {orderStatusLabels[order.status]}
          </span>
          <p className="mt-2 font-semibold">LKR {order.total}</p>
        </div>
      </div>
      <Link
        href={`/account/orders/${order.id}`}
        className="mt-4 inline-flex rounded-md border px-4 py-2 text-sm font-medium"
      >
        View order details
      </Link>
    </article>
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
        {title}
      </h2>
      <p className="mt-1 text-sm text-neutral-600">{description}</p>
      {orders.length ? (
        <div className="mt-4 grid gap-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed p-8 text-center text-sm text-neutral-600">
          {emptyMessage}
        </div>
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
