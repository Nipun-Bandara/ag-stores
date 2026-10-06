import type { Metadata } from "next";

import Link from "next/link";

import { UserRole } from "@/generated/prisma/client";
import { RoleAwareNavigation } from "@/features/auth/components/role-aware-navigation";
import { formatOrderDate } from "@/features/orders/order-presentation";
import { requireRole } from "@/lib/auth/server";
import { listActiveDeliveryBatches } from "@/services/delivery-batch-management.service";

export const metadata: Metadata = { title: "Delivery batches | AG Stores" };

export default async function DeliveryBatchesPage() {
  const user = await requireRole(UserRole.DELIVERY_PERSON, "/delivery/batches");
  const batches = await listActiveDeliveryBatches(user);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <RoleAwareNavigation user={user} />
      <section className="pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-neutral-500">
              Delivery workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Active batches</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Review pending routes and deliveries currently in progress.
            </p>
          </div>
          <Link
            href="/delivery/orders"
            className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-medium text-white"
          >
            Find available orders
          </Link>
        </div>

        {batches.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {batches.map((batch) => (
              <Link
                key={batch.id}
                href={`/delivery/batches/${batch.id}`}
                className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-neutral-400"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                      {batch.status === "PENDING" ? "Pending" : "In progress"}
                    </p>
                    <p className="mt-2 break-all font-mono text-sm font-semibold">
                      {batch.id}
                    </p>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold">
                    {batch.orderCount} order
                    {batch.orderCount === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-4 text-sm text-neutral-600">
                  Created {formatOrderDate(batch.createdAt)}
                </p>
                {batch.status === "IN_PROGRESS" ? (
                  <p className="mt-2 text-sm text-neutral-600">
                    {batch.deliveredCount} delivered · {batch.failedCount}{" "}
                    failed
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed p-10 text-center text-sm text-neutral-600">
            No active delivery batches.
          </div>
        )}
      </section>
    </main>
  );
}
