import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { OwnerOrderStatusActions } from "@/features/owner/components/owner-order-status-actions";
import {
  formatOrderDate,
  orderStatusLabels,
} from "@/features/orders/order-presentation";
import { requireRole } from "@/lib/auth/server";
import { getOwnerOrder, OwnerOrderError } from "@/services/owner-order.service";
import { orderIdSchema } from "@/validations/order";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Order details | AG Stores" };

export default async function OwnerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const orderId = orderIdSchema.safeParse((await params).id);
  if (!orderId.success) notFound();
  const user = await requireRole(
    UserRole.SHOP_OWNER,
    `/owner/orders/${orderId.data}`,
  );
  const order = await getOwnerOrder(user, orderId.data).catch((error) => {
    if (error instanceof OwnerOrderError && error.code === "ORDER_NOT_FOUND") {
      notFound();
    }
    throw error;
  });

  return (
    <section className="min-w-0 w-full">
      <Link
        href="/owner/orders"
        className="text-sm font-medium text-muted-foreground"
      >
        ← Back to orders
      </Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Order number</p>
          <h1 className="mt-1 break-all font-mono text-2xl font-semibold">
            {order.id}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Placed {formatOrderDate(order.createdAt)} at {order.shopName}
          </p>
        </div>
        <Badge variant="secondary">{orderStatusLabels[order.status]}</Badge>
      </div>

      {order.cancelledAt ? (
        <Card as="section" className="gap-0 mt-6 bg-amber-50 p-5">
          <h2 className="font-semibold text-amber-950">
            Customer cancellation
          </h2>
          <p className="mt-2 text-sm text-amber-900">
            Cancelled {formatOrderDate(order.cancelledAt)}
          </p>
          {order.cancellationReason ? (
            <p className="mt-2 text-sm text-amber-900">
              Reason: {order.cancellationReason}
            </p>
          ) : null}
        </Card>
      ) : null}

      <OwnerOrderStatusActions orderId={order.id} status={order.status} />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card as="section" className="gap-0 p-5">
          <h2 className="text-lg font-semibold">Customer and delivery</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Customer</dt>
              <dd className="font-medium">{order.customer.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Contact</dt>
              <dd className="font-medium">
                {order.customer.phone ?? order.customer.email ?? "Not provided"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Delivery address</dt>
              <dd className="font-medium">
                {order.deliveryAddress.label} · {order.deliveryAddress.address}
              </dd>
            </div>
            {order.customerNote ? (
              <div>
                <dt className="text-muted-foreground">Delivery instructions</dt>
                <dd className="font-medium">{order.customerNote}</dd>
              </div>
            ) : null}
          </dl>
        </Card>

        <Card as="section" className="gap-0 p-5">
          <h2 className="text-lg font-semibold">Payment summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt>Subtotal</dt>
              <dd>LKR {order.subtotal}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Delivery fee</dt>
              <dd>LKR {order.deliveryFee}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd>LKR {order.total}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Payment method</dt>
              <dd>Cash on Delivery</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card as="section" className="gap-0 mt-6 p-5">
        <h2 className="text-lg font-semibold">Products</h2>
        <div className="mt-3 divide-y">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex justify-between gap-4 py-4 text-sm"
            >
              <div>
                <p className="font-medium">{item.nameEn}</p>
                <p className="text-muted-foreground">
                  {item.quantity} × LKR {item.unitPrice}
                </p>
              </div>
              <p className="font-medium">LKR {item.lineTotal}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card as="section" className="gap-0 mt-6 p-5">
        <h2 className="text-lg font-semibold">Status history</h2>
        {order.statusHistory.length ? (
          <ol className="mt-4 space-y-4">
            {order.statusHistory.map((history) => (
              <li key={history.id} className="border-l-2 pl-4 text-sm">
                <p className="font-medium">
                  {orderStatusLabels[history.fromStatus]} →{" "}
                  {orderStatusLabels[history.toStatus]}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {history.changedBy.name} ·{" "}
                  {formatOrderDate(history.createdAt)}
                </p>
                {history.note ? <p className="mt-1">{history.note}</p> : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No status changes yet.
          </p>
        )}
      </Card>
    </section>
  );
}
