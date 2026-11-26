import { BackLink } from "@/components/ui/back-link";
import { getServerText } from "@/lib/i18n/server";
import { DateText } from "@/features/i18n/components/date-text";
import { Text } from "@/features/i18n/components/text";
import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { DeliveryBatchActions } from "@/features/delivery/components/delivery-batch-actions";
import { DeliveryMap } from "@/features/maps/components/delivery-map";
import { buildDeliveryMapData } from "@/features/maps/delivery-map-data";
import { DeliveryStopsTimeline } from "@/features/delivery/components/delivery-stops-timeline";
import { requireRole } from "@/lib/auth/server";
import {
  DeliveryBatchManagementError,
  getDeliveryBatch,
} from "@/services/delivery-batch-management.service";
import { batchIdSchema } from "@/validations/delivery-batch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Delivery batch")} | AG Stores` };
}

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
  const locale = await getCurrentLocale();
  const mapData = buildDeliveryMapData({
    shop: batch.shopLocation,
    stops: batch.orders.map((order) => ({
      id: order.id,
      sequence: order.sequence,
      label: order.customerFirstName,
      latitude: order.deliveryLocation.latitude,
      longitude: order.deliveryLocation.longitude,
    })),
  });

  return (
    <section className="min-w-0 w-full">
      <BackLink href="/delivery/batches">
        <Text value="Back to active batches" />
      </BackLink>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">
            <Text value={"Batch ID"} />
          </p>
          <h1 className="mt-1 break-all font-mono text-lg font-semibold text-foreground sm:text-xl">
            {batch.id}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            <Text value={"Created "} />
            <DateText value={batch.createdAt} />
          </p>
        </div>
        <Badge variant="secondary">
          <Text
            value={batch.status === "PENDING" ? "Pending" : "In progress"}
          />
        </Badge>
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(20rem,0.85fr)_minmax(0,1.15fr)]">
        <DeliveryBatchActions
          batchId={batch.id}
          status={batch.status}
          orders={batch.orders}
        />

        <DeliveryMap data={mapData} locale={locale} />
      </div>

      <Card
        as="section"
        className="mt-4 min-w-0 gap-0 border border-border p-4 ring-0 sm:p-5"
      >
        <h2 className="text-lg font-semibold">
          <Text value={"Delivery stops"} />
        </h2>
        <DeliveryStopsTimeline batch={batch} />
      </Card>
    </section>
  );
}
