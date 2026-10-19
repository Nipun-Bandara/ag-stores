import { getServerText } from "@/lib/i18n/server";
import { CountNoun } from "@/features/i18n/components/count-noun";
import { DateText } from "@/features/i18n/components/date-text";
import { Text } from "@/features/i18n/components/text";
import type { Metadata } from "next";

import Link from "next/link";

import { UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/server";
import { listActiveDeliveryBatches } from "@/services/delivery-batch-management.service";
import { Card } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Delivery batches")} | AG Stores` };
}

export default async function DeliveryBatchesPage() {
  const user = await requireRole(UserRole.DELIVERY_PERSON, "/delivery/batches");
  const batches = await listActiveDeliveryBatches(user);

  return (
    <section className="min-w-0 w-full">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            <Text value={"Delivery workspace "} />
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            <Text value={"Active batches"} />
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            <Text
              value={
                "Review pending routes and deliveries currently in progress. "
              }
            />
          </p>
        </div>
        <Link
          href="/delivery/orders"
          className={buttonVariants({ variant: "default", className: "" })}
        >
          <Text value={"Find available orders "} />
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
                      <Text
                        value={
                          batch.status === "PENDING" ? "Pending" : "In progress"
                        }
                      />
                    </p>
                    <p className="mt-2 break-all font-mono text-sm font-semibold">
                      {batch.id}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {batch.orderCount}{" "}
                    <CountNoun
                      count={batch.orderCount}
                      singular="order"
                      plural="orders"
                    />
                  </Badge>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  <Text value={"Created "} />
                  <DateText value={batch.createdAt} />
                </p>
                {batch.status === "IN_PROGRESS" ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {batch.deliveredCount} <Text value={"delivered · "} />
                    {batch.failedCount} <Text value={"failed "} />
                  </p>
                ) : null}
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Empty className="mt-6">
          <EmptyHeader>
            <EmptyTitle>
              <Text value={"No active delivery batches. "} />
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  );
}
