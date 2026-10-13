import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { CustomerOrderCancellation } from "@/features/account/components/customer-order-cancellation";
import {
  formatOrderDate,
  orderStatusLabels,
} from "@/features/orders/order-presentation";
import { requireRole } from "@/lib/auth/server";
import {
  CustomerOrderError,
  getCustomerOrderDetails,
} from "@/services/customer-order.service";
import { orderIdSchema } from "@/validations/order";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Order tracking | AG Stores" };

export default async function CustomerOrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const orderId = orderIdSchema.safeParse((await params).id);
  if (!orderId.success) notFound();
  const user = await requireRole(
    UserRole.CUSTOMER,
    `/account/orders/${orderId.data}`,
  );
  const order = await getCustomerOrderDetails(user, orderId.data).catch(
    (error) => {
      if (
        error instanceof CustomerOrderError &&
        error.code === "ORDER_NOT_FOUND"
      ) {
        notFound();
      }
      throw error;
    },
  );

  return (
    <section className="min-w-0 w-full">
      <Link
        href="/account/orders"
        className="text-sm font-medium text-muted-foreground"
      >
        ← Back to your orders
      </Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Order number</p>
          <h1 className="mt-1 break-all font-mono text-2xl font-semibold">
            {order.id}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ordered from {order.shopName} on {formatOrderDate(order.createdAt)}
          </p>
        </div>
        <Badge variant="success" data-testid="customer-order-status">
          {orderStatusLabels[order.status]}
        </Badge>
      </div>

      {order.cancelledAt ? (
        <Card as="section" className="gap-0 mt-6 bg-amber-50 p-5">
          <h2 className="font-semibold text-amber-950">Order cancelled</h2>
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

      {order.status === "PLACED" ? (
        <CustomerOrderCancellation orderId={order.id} />
      ) : null}

      <Card as="section" className="gap-0 mt-6 p-5">
        <h2 className="text-lg font-semibold">Tracking timeline</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2">
          {order.timeline.map((event, index) => (
            <li
              key={`${event.status}-${event.createdAt}-${index}`}
              className="border-l-2 border-emerald-700 pl-4"
            >
              <p className="font-medium">{orderStatusLabels[event.status]}</p>
              <time className="mt-1 block text-sm text-muted-foreground">
                {formatOrderDate(event.createdAt)}
              </time>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-muted-foreground">
          Last updated {formatOrderDate(order.updatedAt)}
        </p>
      </Card>

      <Card as="section" className="gap-0 mt-6 p-5">
        <h2 className="text-lg font-semibold">Ordered items</h2>
        <div className="mt-3 divide-y">
          {order.items.map((item) => (
            <div
              key={item.id}
              data-testid="customer-order-item"
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

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <Card as="section" className="gap-0 p-5">
          <h2 className="text-lg font-semibold">Delivery address</h2>
          <p className="mt-3 text-sm font-medium">
            {order.deliveryAddress.label}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.deliveryAddress.address}
          </p>
          {order.customerNote ? (
            <div className="mt-4 border-t pt-4 text-sm">
              <p className="font-medium">Delivery instructions</p>
              <p className="mt-1 text-muted-foreground">{order.customerNote}</p>
            </div>
          ) : null}
        </Card>

        <Card as="section" className="gap-0 p-5">
          <h2 className="text-lg font-semibold">Order totals</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt>Subtotal</dt>
              <dd data-testid="customer-order-subtotal">
                LKR {order.subtotal}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Delivery fee</dt>
              <dd>LKR {order.deliveryFee}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd data-testid="customer-order-total">LKR {order.total}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Payment</dt>
              <dd>Cash on Delivery</dd>
            </div>
          </dl>
        </Card>
      </div>
    </section>
  );
}
