import { BackLink } from "@/components/ui/back-link";
import { getLocaleContext as getPriceLocaleContext } from "@/lib/i18n/server";
import { PriceSummary } from "@/features/pricing/price-display";
import { OwnerPackingSection } from "@/features/owner/components/owner-packing-section";
import { OwnerOrderTimeline } from "@/features/owner/components/owner-order-timeline";
import { BilingualText } from "@/features/i18n/components/bilingual-text";
import { getServerText } from "@/lib/i18n/server";
import { DateText } from "@/features/i18n/components/date-text";
import { Text } from "@/features/i18n/components/text";
import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { OwnerOrderStatusActions } from "@/features/owner/components/owner-order-status-actions";
import { OwnerOrderReceipt } from "@/features/owner/components/owner-order-receipt";
import { orderStatusLabels } from "@/features/orders/order-presentation";
import { requireRole } from "@/lib/auth/server";
import { getOwnerOrder, OwnerOrderError } from "@/services/owner-order.service";
import { orderIdSchema } from "@/validations/order";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Order details")} | AG Stores` };
}

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

  const { locale: priceLocale } = await getPriceLocaleContext();
  return (
    <section className="min-w-0 w-full">
      <BackLink href="/owner/orders">
        <Text value="Back to orders" />
      </BackLink>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">
            <Text value={"Order number"} />
          </p>
          <h1 className="mt-1 break-all font-mono text-2xl font-semibold">
            {order.id}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            <Text value={"Placed "} />
            <DateText value={order.createdAt} /> <Text value={"at "} />
            {order.shopName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <OwnerOrderReceipt order={order} cashier={user.name} />
          <Badge variant="secondary">
            <Text value={orderStatusLabels[order.status]} />
          </Badge>
        </div>
      </div>

      {order.cancelledAt ? (
        <Card as="section" className="gap-0 mt-6 bg-muted/40 p-4 sm:p-5">
          <h2 className="font-semibold">
            <Text value={"Customer cancellation "} />
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            <Text value={"Cancelled "} />
            <DateText value={order.cancelledAt} />
          </p>
          {order.cancellationReason ? (
            <p className="mt-2 text-sm text-muted-foreground">
              <Text value={"Reason: "} />
              {order.cancellationReason}
            </p>
          ) : null}
        </Card>
      ) : null}

      <OwnerOrderStatusActions
        key={order.status}
        orderId={order.id}
        status={order.status}
        canMarkReady={
          !order.packingRequired ||
          order.items
            .filter((item) => item.sellingUnit === "KG")
            .every((item) => item.packedQuantity !== null)
        }
      />
      <OwnerPackingSection order={order} />

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]">
        <Card as="section" className="min-w-0 gap-0 p-4 sm:p-5">
          <h2 className="text-lg font-semibold">
            <Text value={"Customer and delivery"} />
          </h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">
                <Text value={"Customer"} />
              </dt>
              <dd className="break-words font-medium">{order.customer.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                <Text value={"Contact"} />
              </dt>
              <dd className="break-words font-medium">
                {order.customer.phone ?? order.customer.email ?? (
                  <Text value="Not provided" />
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                <Text value={"Delivery address"} />
              </dt>
              <dd className="break-words font-medium">
                {order.deliveryAddress.label} · {order.deliveryAddress.address}
              </dd>
            </div>
            {order.customerNote ? (
              <div>
                <dt className="text-muted-foreground">
                  <Text value={"Delivery instructions"} />
                </dt>
                <dd className="break-words font-medium">
                  {order.customerNote}
                </dd>
              </div>
            ) : null}
          </dl>
        </Card>

        <Card as="section" className="min-w-0 gap-0 p-4 sm:p-5">
          <h2 className="text-lg font-semibold">
            <Text value={"Payment summary"} />
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            {order.packingRequired ? (
              <>
                <div className="flex justify-between gap-4">
                  <dt>
                    <Text value="Estimated subtotal" />
                  </dt>
                  <dd>LKR {order.estimatedSubtotal ?? order.subtotal}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>
                    <Text value="Estimated total" />
                  </dt>
                  <dd>LKR {order.estimatedTotal ?? order.total}</dd>
                </div>
                <div>
                  <Text
                    value={
                      order.packingFinalizedAt
                        ? "Final amount to collect"
                        : "Current amount (estimated until packing is finalized)"
                    }
                  />
                </div>
              </>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt>
                <Text value={"Subtotal"} />
              </dt>
              <dd>LKR {order.subtotal}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>
                <Text value={"Delivery fee"} />
              </dt>
              <dd>LKR {order.deliveryFee}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-3 text-base font-semibold">
              <dt>
                <Text value={"Total"} />
              </dt>
              <dd>LKR {order.total}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>
                <Text value={"Payment method"} />
              </dt>
              <dd>
                <Text value={"Cash on Delivery"} />
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]">
        <Card as="section" className="min-w-0 gap-0 p-4 sm:p-5">
          <h2 className="text-lg font-semibold">
            <Text value={"Products"} />
          </h2>
          <div className="mt-3 divide-y divide-border">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="break-words font-medium">
                    <BilingualText
                      english={item.nameEn}
                      sinhala={item.nameSi}
                    />
                  </p>
                  <p className="text-muted-foreground">
                    {item.quantity}{" "}
                    <Text
                      value={item.sellingUnit === "KG" ? "kg" : "units"}
                    />{" "}
                  </p>
                  {item.sellingUnit === "KG" ? (
                    <p className="text-muted-foreground">
                      <Text value="Packed weight" />:{" "}
                      {item.packedQuantity === null ? (
                        <Text value="Not confirmed" />
                      ) : (
                        `${item.packedQuantity} kg`
                      )}
                    </p>
                  ) : null}
                  <PriceSummary
                    separateLineItems
                    pricing={item}
                    sellingUnit={item.sellingUnit}
                    locale={priceLocale}
                  />
                </div>
                <p className="shrink-0 font-medium">LKR {item.lineTotal}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card as="section" className="min-w-0 gap-0 p-4 sm:p-5">
          <h2 className="text-lg font-semibold">
            <Text value={"Status history"} />
          </h2>
          <OwnerOrderTimeline history={order.statusHistory} />
        </Card>
      </div>
    </section>
  );
}
