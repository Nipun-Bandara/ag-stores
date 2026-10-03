import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { RoleAwareNavigation } from "@/features/auth/components/role-aware-navigation";
import { OwnerOrderStatusActions } from "@/features/owner/components/owner-order-status-actions";
import {
  formatOrderDate,
  orderStatusLabels,
} from "@/features/orders/order-presentation";
import { requireRole } from "@/lib/auth/server";
import { getOwnerOrder, OwnerOrderError } from "@/services/owner-order.service";
import { orderIdSchema } from "@/validations/order";

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
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <RoleAwareNavigation user={user} />
      <section className="pt-8">
        <Link
          href="/owner/orders"
          className="text-sm font-medium text-neutral-600"
        >
          ← Back to orders
        </Link>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-500">Order number</p>
            <h1 className="mt-1 break-all font-mono text-2xl font-semibold">
              {order.id}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Placed {formatOrderDate(order.createdAt)} at {order.shopName}
            </p>
          </div>
          <span className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-semibold">
            {orderStatusLabels[order.status]}
          </span>
        </div>

        <OwnerOrderStatusActions orderId={order.id} status={order.status} />

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border bg-white p-5">
            <h2 className="text-lg font-semibold">Customer and delivery</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-neutral-500">Customer</dt>
                <dd className="font-medium">{order.customer.name}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Contact</dt>
                <dd className="font-medium">
                  {order.customer.phone ??
                    order.customer.email ??
                    "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Delivery address</dt>
                <dd className="font-medium">
                  {order.deliveryAddress.label} ·{" "}
                  {order.deliveryAddress.address}
                </dd>
              </div>
              {order.customerNote ? (
                <div>
                  <dt className="text-neutral-500">Delivery instructions</dt>
                  <dd className="font-medium">{order.customerNote}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="rounded-xl border bg-white p-5">
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
          </section>
        </div>

        <section className="mt-6 rounded-xl border bg-white p-5">
          <h2 className="text-lg font-semibold">Products</h2>
          <div className="mt-3 divide-y">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between gap-4 py-4 text-sm"
              >
                <div>
                  <p className="font-medium">{item.nameEn}</p>
                  <p className="text-neutral-500">
                    {item.quantity} × LKR {item.unitPrice}
                  </p>
                </div>
                <p className="font-medium">LKR {item.lineTotal}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-xl border bg-white p-5">
          <h2 className="text-lg font-semibold">Status history</h2>
          {order.statusHistory.length ? (
            <ol className="mt-4 space-y-4">
              {order.statusHistory.map((history) => (
                <li key={history.id} className="border-l-2 pl-4 text-sm">
                  <p className="font-medium">
                    {orderStatusLabels[history.fromStatus]} →{" "}
                    {orderStatusLabels[history.toStatus]}
                  </p>
                  <p className="mt-1 text-neutral-500">
                    {history.changedBy.name} ·{" "}
                    {formatOrderDate(history.createdAt)}
                  </p>
                  {history.note ? <p className="mt-1">{history.note}</p> : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-neutral-500">
              No status changes yet.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}
