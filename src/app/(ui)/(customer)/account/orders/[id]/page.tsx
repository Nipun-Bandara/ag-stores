import { getLocaleContext as getPriceLocaleContext } from "@/lib/i18n/server";
import { PriceSummary } from "@/features/pricing/price-display";
import { BilingualText } from "@/features/i18n/components/bilingual-text";
import { getServerText } from "@/lib/i18n/server";
import { DateText } from "@/features/i18n/components/date-text";
import { Text } from "@/features/i18n/components/text";
import type { Metadata } from "next";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CustomerOrderTimeline } from "@/features/account/components/customer-order-timeline";
import { cn } from "@/lib/utils";
import { notFound } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { CustomerOrderCancellation } from "@/features/account/components/customer-order-cancellation";
import { orderStatusLabels } from "@/features/orders/order-presentation";
import { requireRole } from "@/lib/auth/server";
import {
  CustomerOrderError,
  getCustomerOrderDetails,
} from "@/services/customer-order.service";
import { orderIdSchema } from "@/validations/order";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Order tracking")} | AG Stores` };
}

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

  const { locale: priceLocale } = await getPriceLocaleContext();
  return (
    <section className="min-w-0 w-full">
      <Link
        href="/account/orders"
        className={cn(buttonVariants({ variant: null }), "px-0 no-underline")}
      >
        <ArrowLeft aria-hidden="true" />
        <Text value="Back to your orders" />
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">
            <Text value={"Order number"} />
          </p>
          <h1 className="mt-1 break-all font-mono text-lg sm:text-xl font-semibold">
            {order.id}
          </h1>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            <Text value={"Ordered from "} />
            {order.shopName} <Text value={"on "} />
            <DateText value={order.createdAt} />
          </p>
        </div>
        <Badge
          variant="success"
          className="max-w-full whitespace-normal"
          data-testid="customer-order-status"
        >
          <Text value={orderStatusLabels[order.status]} />
        </Badge>
      </div>

      {order.cancelledAt ? (
        <Card as="section" className="mt-4 gap-0 bg-muted p-4">
          <h2 className="font-semibold text-foreground">
            <Text value={"Order cancelled"} />
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

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.65fr)]">
        <Card
          as="section"
          className="min-w-0 gap-0 p-4 xl:col-start-2 xl:row-start-1"
        >
          <h2 className="text-lg font-semibold">
            <Text value="Tracking timeline" />
          </h2>
          <CustomerOrderTimeline events={order.timeline} />
          <p className="mt-4 text-xs text-muted-foreground">
            <Text value="Last updated " />
            <DateText value={order.updatedAt} />
          </p>
        </Card>
        <div className="min-w-0 space-y-4 xl:col-start-1 xl:row-start-1">
          <Card as="section" className="min-w-0 gap-0 p-4">
            <h2 className="text-lg font-semibold">
              <Text value={"Ordered items"} />
            </h2>
            <div className="mt-3 divide-y">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  data-testid="customer-order-item"
                  className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 py-3 text-sm"
                >
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="break-words font-medium">
                      <BilingualText
                        english={item.nameEn}
                        sinhala={item.nameSi}
                      />
                    </p>
                    <p className="text-muted-foreground">
                      <Text
                        value={
                          item.sellingUnit === "KG"
                            ? "Requested weight"
                            : "Quantity"
                        }
                      />
                      : {item.quantity}{" "}
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
                  <p className="font-medium tabular-nums">
                    LKR {item.lineTotal}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card as="section" className="min-w-0 gap-0 p-4">
              <h2 className="text-lg font-semibold">
                <Text value={"Delivery address"} />
              </h2>
              <p className="mt-3 text-sm font-medium">
                {order.deliveryAddress.label}
              </p>
              <p className="mt-1 break-words text-sm text-muted-foreground">
                {order.deliveryAddress.address}
              </p>
              {order.customerNote ? (
                <div className="mt-4 border-t pt-4 text-sm">
                  <p className="font-medium">
                    <Text value={"Delivery instructions"} />
                  </p>
                  <p className="mt-1 break-words text-muted-foreground">
                    {order.customerNote}
                  </p>
                </div>
              ) : null}
            </Card>

            <Card as="section" className="min-w-0 gap-0 p-4">
              <h2 className="text-lg font-semibold">
                <Text value={"Order totals"} />
              </h2>
              <dl className="mt-3 space-y-3 text-sm">
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
                    <p>
                      <Text
                        value={
                          order.packingFinalizedAt
                            ? "Final amount to collect"
                            : "Amount is estimated until packing is finalized"
                        }
                      />
                    </p>
                  </>
                ) : null}
                <div className="flex justify-between gap-4">
                  <dt>
                    <Text value={"Subtotal"} />
                  </dt>
                  <dd data-testid="customer-order-subtotal">
                    LKR {order.subtotal}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>
                    <Text value={"Delivery fee"} />
                  </dt>
                  <dd>LKR {order.deliveryFee}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t pt-3 text-base font-semibold">
                  <dt>
                    <Text value={"Total"} />
                  </dt>
                  <dd data-testid="customer-order-total">LKR {order.total}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>
                    <Text value={"Payment"} />
                  </dt>
                  <dd>
                    <Text value={"Cash on Delivery"} />
                  </dd>
                </div>
              </dl>
            </Card>
          </div>
          {order.status === "PLACED" ? (
            <CustomerOrderCancellation orderId={order.id} />
          ) : null}
        </div>
      </div>
    </section>
  );
}
