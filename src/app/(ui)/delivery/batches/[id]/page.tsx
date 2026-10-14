import { getServerText } from "@/lib/i18n/server";
import { DateText } from "@/features/i18n/components/date-text";
import { Text } from "@/features/i18n/components/text";
import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { DeliveryBatchActions } from "@/features/delivery/components/delivery-batch-actions";
import { DeliveryMap } from "@/features/maps/components/delivery-map";
import { buildDeliveryMapData } from "@/features/maps/delivery-map-data";
import { orderStatusLabels } from "@/features/orders/order-presentation";
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
      label: order.deliveryLocation.label,
      latitude: order.deliveryLocation.latitude,
      longitude: order.deliveryLocation.longitude,
    })),
  });

  return (
    <section className="min-w-0 w-full">
      <Link
        href="/delivery/batches"
        className="text-sm font-medium text-muted-foreground"
      >
        <Text value={"← Back to active batches "} />
      </Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Text value={"Batch ID"} />
          </p>
          <h1 className="mt-1 break-all font-mono text-2xl font-semibold">
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

      <DeliveryBatchActions
        batchId={batch.id}
        status={batch.status}
        orders={batch.orders}
      />

      <DeliveryMap data={mapData} locale={locale} />

      <Card as="section" className="gap-0 mt-6 p-5">
        <h2 className="text-lg font-semibold">
          <Text value={"Delivery stops"} />
        </h2>
        <ol className="mt-4 space-y-4">
          {batch.orders.map((order) => (
            <Card as="li" key={order.id} className="gap-0 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <Text value={"Stop "} />
                    {order.sequence}
                  </p>
                  <p className="mt-1 break-all font-mono text-sm font-semibold">
                    {order.id}
                  </p>
                </div>
                <Badge variant="secondary">
                  <Text value={orderStatusLabels[order.status]} />
                </Badge>
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">
                    <Text value={"Delivery location"} />
                  </dt>
                  <dd className="font-medium">
                    {order.deliveryLocation.label} ·{" "}
                    {order.deliveryLocation.address}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    <Text value={"Coordinates"} />
                  </dt>
                  <dd className="font-medium">
                    {order.deliveryLocation.latitude},{" "}
                    {order.deliveryLocation.longitude}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    <Text value={"Items"} />
                  </dt>
                  <dd className="font-medium">{order.itemCount}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    <Text value={"Cash on delivery"} />
                  </dt>
                  <dd className="font-medium">LKR {order.total}</dd>
                </div>
                {order.customerNote ? (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">
                      <Text value={"Delivery instructions "} />
                    </dt>
                    <dd className="font-medium">{order.customerNote}</dd>
                  </div>
                ) : null}
              </dl>
            </Card>
          ))}
        </ol>
      </Card>
    </section>
  );
}
