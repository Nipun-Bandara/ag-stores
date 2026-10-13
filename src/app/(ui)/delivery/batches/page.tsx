import type { Metadata } from "next";

import Link from "next/link";

import { UserRole } from "@/generated/prisma/client";
import { formatOrderDate } from "@/features/orders/order-presentation";
import { requireRole } from "@/lib/auth/server";
import { listActiveDeliveryBatches } from "@/services/delivery-batch-management.service";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Delivery batches | AG Stores" };

export default async function DeliveryBatchesPage() {
  const user = await requireRole(UserRole.DELIVERY_PERSON, "/delivery/batches");
  const batches = await listActiveDeliveryBatches(user);

  return (
    <section className="min-w-0 w-full">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Delivery workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Active batches</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Review pending routes and deliveries currently in progress.
          </p>
        </div>
        <Link
          href="/delivery/orders"
          className={buttonVariants({ variant: "default", className: "" })}
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
              className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Card className="h-full gap-0 p-5 transition hover:border-border">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {batch.status === "PENDING" ? "Pending" : "In progress"}
                    </p>
                    <p className="mt-2 break-all font-mono text-sm font-semibold">
                      {batch.id}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {batch.orderCount} order
                    {batch.orderCount === 1 ? "" : "s"}
                  </Badge>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Created {formatOrderDate(batch.createdAt)}
                </p>
                {batch.status === "IN_PROGRESS" ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {batch.deliveredCount} delivered · {batch.failedCount}{" "}
                    failed
                  </p>
                ) : null}
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="gap-0 mt-6 border-dashed p-10 text-center text-muted-foreground border ring-0">
          No active delivery batches.
        </Card>
      )}
    </section>
  );
}
