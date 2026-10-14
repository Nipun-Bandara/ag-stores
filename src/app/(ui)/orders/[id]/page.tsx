import { getServerText } from "@/lib/i18n/server";
import { Text } from "@/features/i18n/components/text";
import { BilingualText } from "@/features/i18n/components/bilingual-text";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/server";
import { CheckoutError, getCustomerOrder } from "@/services/checkout.service";
import { orderIdSchema } from "@/validations/checkout";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Order confirmed")} | AG Stores` };
}

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const orderId = orderIdSchema.safeParse((await params).id);
  if (!orderId.success) notFound();
  const user = await requireRole(UserRole.CUSTOMER, `/orders/${orderId.data}`);
  const order = await getCustomerOrder(user, orderId.data).catch((error) => {
    if (error instanceof CheckoutError && error.code === "ORDER_NOT_FOUND") {
      notFound();
    }
    throw error;
  });

  return (
    <section className="min-w-0 w-full">
      <Card as="section" className="gap-0 p-4 sm:p-6">
        <Badge variant="success" className="self-start">
          <Text value={"Order confirmed "} />
        </Badge>
        <h1 className="mt-5 text-4xl font-black tracking-tight text-foreground">
          <Text value={"Thank you for your order "} />
        </h1>
        <p className="mt-3 text-muted-foreground">
          <Text value={"Pay with cash when your delivery arrives. "} />
        </p>
        <dl className="mt-8 grid gap-4 rounded-2xl bg-muted/50 p-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">
              <Text value={"Order number"} />
            </dt>
            <dd className="mt-1 break-all font-bold text-foreground">
              {order.id}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              <Text value={"Shop"} />
            </dt>
            <dd className="mt-1 font-bold text-foreground">{order.shopName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              <Text value={"Delivery address"} />
            </dt>
            <dd className="mt-1 font-bold text-foreground">
              {order.deliveryAddress.label} · {order.deliveryAddress.address}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              <Text value={"Payment"} />
            </dt>
            <dd className="mt-1 font-bold text-foreground">
              <Text value={"Cash on Delivery"} />
            </dd>
          </div>
        </dl>

        <section className="mt-8" aria-labelledby="confirmed-items-heading">
          <h2
            id="confirmed-items-heading"
            className="text-xl font-black text-foreground"
          >
            <Text value={"Products "} />
          </h2>
          <div className="mt-3 divide-y">
            {order.items.map((item) => (
              <div
                key={item.productId}
                className="flex justify-between gap-4 py-4 text-sm"
              >
                <span>
                  <span className="block font-bold text-foreground">
                    <BilingualText english={item.name} sinhala={item.nameSi} />
                  </span>
                  <span className="text-muted-foreground">
                    {item.quantity} × LKR {item.unitPrice}
                  </span>
                </span>
                <span className="font-bold">LKR {item.lineTotal}</span>
              </div>
            ))}
          </div>
        </section>

        <dl className="mt-6 space-y-3 border-t pt-6 text-sm">
          <div className="flex justify-between">
            <dt>
              <Text value={"Subtotal"} />
            </dt>
            <dd>LKR {order.subtotal}</dd>
          </div>
          <div className="flex justify-between">
            <dt>
              <Text value={"Delivery fee"} />
            </dt>
            <dd>LKR {order.deliveryFee}</dd>
          </div>
          <div className="flex justify-between text-lg font-black text-foreground">
            <dt>
              <Text value={"Total"} />
            </dt>
            <dd data-testid="confirmed-total">LKR {order.total}</dd>
          </div>
        </dl>
        {order.deliveryInstructions ? (
          <Card className="gap-0 mt-6 p-4">
            <p className="font-bold text-foreground">
              <Text value={"Delivery instructions"} />
            </p>
            <p className="mt-1 text-muted-foreground">
              {order.deliveryInstructions}
            </p>
          </Card>
        ) : null}
        <Link
          href={`/account/orders/${order.id}`}
          className={buttonVariants({
            variant: "default",
            className: "mt-8 inline-flex",
          })}
        >
          <Text value={"Track this order "} />
        </Link>
        <Link
          href="/products"
          className={buttonVariants({
            variant: "outline",
            className: "mt-8 ml-3 inline-flex",
          })}
        >
          <Text value={"Continue shopping "} />
        </Link>
      </Card>
    </section>
  );
}
