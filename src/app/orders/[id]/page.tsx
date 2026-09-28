import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import { StorefrontHeader } from "@/features/storefront/components/storefront-header";
import { UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/server";
import { CheckoutError, getCustomerOrder } from "@/services/checkout.service";
import { orderIdSchema } from "@/validations/checkout";

export const metadata: Metadata = { title: "Order confirmed | AG Stores" };

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
    <div className="min-h-screen bg-[#fffdf7]">
      <StorefrontHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <section className="rounded-3xl border border-emerald-950/10 bg-white p-6 shadow-sm sm:p-10">
          <div className="inline-flex rounded-full bg-lime-100 px-4 py-2 text-sm font-bold text-emerald-800">
            Order confirmed
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-emerald-950">
            Thank you for your order
          </h1>
          <p className="mt-3 text-neutral-600">
            Pay with cash when your delivery arrives.
          </p>
          <dl className="mt-8 grid gap-4 rounded-2xl bg-emerald-50 p-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-neutral-500">Order number</dt>
              <dd className="mt-1 break-all font-bold text-emerald-950">
                {order.id}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">Shop</dt>
              <dd className="mt-1 font-bold text-emerald-950">
                {order.shopName}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">Delivery address</dt>
              <dd className="mt-1 font-bold text-emerald-950">
                {order.deliveryAddress.label} · {order.deliveryAddress.address}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">Payment</dt>
              <dd className="mt-1 font-bold text-emerald-950">
                Cash on Delivery
              </dd>
            </div>
          </dl>

          <section className="mt-8" aria-labelledby="confirmed-items-heading">
            <h2
              id="confirmed-items-heading"
              className="text-xl font-black text-emerald-950"
            >
              Products
            </h2>
            <div className="mt-3 divide-y">
              {order.items.map((item) => (
                <div
                  key={item.productId}
                  className="flex justify-between gap-4 py-4 text-sm"
                >
                  <span>
                    <span className="block font-bold text-emerald-950">
                      {item.name}
                    </span>
                    <span className="text-neutral-500">
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
              <dt>Subtotal</dt>
              <dd>LKR {order.subtotal}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Delivery fee</dt>
              <dd>LKR {order.deliveryFee}</dd>
            </div>
            <div className="flex justify-between text-lg font-black text-emerald-950">
              <dt>Total</dt>
              <dd data-testid="confirmed-total">LKR {order.total}</dd>
            </div>
          </dl>
          {order.deliveryInstructions ? (
            <div className="mt-6 rounded-xl border p-4 text-sm">
              <p className="font-bold text-emerald-950">
                Delivery instructions
              </p>
              <p className="mt-1 text-neutral-600">
                {order.deliveryInstructions}
              </p>
            </div>
          ) : null}
          <Link
            href="/products"
            className="mt-8 inline-flex rounded-xl bg-emerald-950 px-5 py-3 text-sm font-bold text-white"
          >
            Continue shopping
          </Link>
        </section>
      </main>
    </div>
  );
}
