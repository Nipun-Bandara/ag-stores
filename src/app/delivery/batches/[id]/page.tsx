import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { RoleAwareNavigation } from "@/features/auth/components/role-aware-navigation";
import { DeliveryBatchActions } from "@/features/delivery/components/delivery-batch-actions";
import {
  formatOrderDate,
  orderStatusLabels,
} from "@/features/orders/order-presentation";
import { requireRole } from "@/lib/auth/server";
import {
  DeliveryBatchManagementError,
  getDeliveryBatch,
} from "@/services/delivery-batch-management.service";
import { batchIdSchema } from "@/validations/delivery-batch";

export const metadata: Metadata = { title: "Delivery batch | AG Stores" };

export default async function DeliveryBatchDetailPage({
  params,
}: PageProps<"/delivery/batches/[id]">) {
  const batchId = batchIdSchema.safeParse((await params).id);
  if (!batchId.success) notFound();
  const user = await requireRole(
    UserRole.DELIVERY_PERSON,
    `/delivery/batches/${batchId.data}`,
  );
  const batch = await getDeliveryBatch(user, batchId.data).catch((error) => {
    if (
      error instanceof DeliveryBatchManagementError &&
      error.code === "BATCH_NOT_FOUND"
    ) {
      notFound();
    }
    throw error;
  });

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <RoleAwareNavigation user={user} />
      <section className="pt-8">
        <Link
          href="/delivery/batches"
          className="text-sm font-medium text-neutral-600"
        >
          ← Back to active batches
        </Link>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-500">Batch ID</p>
            <h1 className="mt-1 break-all font-mono text-2xl font-semibold">
              {batch.id}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Created {formatOrderDate(batch.createdAt)}
            </p>
          </div>
          <span className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-semibold">
            {batch.status.replaceAll("_", " ")}
          </span>
        </div>

        <DeliveryBatchActions
          batchId={batch.id}
          status={batch.status}
          orders={batch.orders}
        />

        <section className="mt-6 rounded-xl border bg-white p-5">
          <h2 className="text-lg font-semibold">Delivery stops</h2>
          <ol className="mt-4 space-y-4">
            {batch.orders.map((order) => (
              <li key={order.id} className="rounded-xl border p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                      Stop {order.sequence}
                    </p>
                    <p className="mt-1 break-all font-mono text-sm font-semibold">
                      {order.id}
                    </p>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold">
                    {orderStatusLabels[order.status]}
                  </span>
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-neutral-500">Delivery location</dt>
                    <dd className="font-medium">
                      {order.deliveryLocation.label} ·{" "}
                      {order.deliveryLocation.address}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Coordinates</dt>
                    <dd className="font-medium">
                      {order.deliveryLocation.latitude},{" "}
                      {order.deliveryLocation.longitude}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Items</dt>
                    <dd className="font-medium">{order.itemCount}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Cash on delivery</dt>
                    <dd className="font-medium">LKR {order.total}</dd>
                  </div>
                  {order.customerNote ? (
                    <div className="sm:col-span-2">
                      <dt className="text-neutral-500">
                        Delivery instructions
                      </dt>
                      <dd className="font-medium">{order.customerNote}</dd>
                    </div>
                  ) : null}
                </dl>
              </li>
            ))}
          </ol>
        </section>
      </section>
    </main>
  );
}
