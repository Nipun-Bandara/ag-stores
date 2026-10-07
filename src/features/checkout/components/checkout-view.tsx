"use client";

import { useEffect, useState, type FormEvent } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useCart } from "@/features/cart/cart-store";
import {
  addMinorUnits,
  minorUnitsToMoney,
  moneyToMinorUnits,
} from "@/lib/money";
import type { CustomerAddressView } from "@/services/customer-address.service";

interface CheckoutPayload {
  data?: { id?: string };
  error?: { message?: string };
}

interface QuotePayload {
  data?: { subtotal?: string; deliveryFee?: string | null };
}

export function CheckoutView({
  addresses,
}: {
  addresses: CustomerAddressView[];
}) {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [serverQuote, setServerQuote] = useState<{
    subtotal: string;
    deliveryFee: string;
  }>();
  const quotedSubtotal = serverQuote?.subtotal ?? subtotal;
  const deliveryFee = serverQuote?.deliveryFee;
  const total = deliveryFee
    ? minorUnitsToMoney(
        addMinorUnits(
          moneyToMinorUnits(quotedSubtotal),
          moneyToMinorUnits(deliveryFee),
        ),
      )
    : null;
  const defaultAddress = addresses.find((address) => address.isDefault);

  useEffect(() => {
    if (items.length === 0) return;
    const controller = new AbortController();
    void fetch("/api/checkout/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as QuotePayload;
        if (response.ok && payload.data?.subtotal && payload.data.deliveryFee) {
          setServerQuote({
            subtotal: payload.data.subtotal,
            deliveryFee: payload.data.deliveryFee,
          });
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [items]);

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryAddressId: form.get("deliveryAddressId"),
        deliveryInstructions: form.get("deliveryInstructions"),
        items: items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      }),
    }).catch(() => null);
    const payload = response
      ? ((await response.json().catch(() => ({}))) as CheckoutPayload)
      : {};

    if (!response?.ok || !payload.data?.id) {
      setError(payload.error?.message ?? "Unable to place your order.");
      setPending(false);
      return;
    }

    clear();
    router.push(`/orders/${payload.data.id}`);
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-emerald-950/20 bg-white p-10 text-center">
        <h2 className="text-xl font-black text-emerald-950">
          Your cart is empty
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          Add at least one available product before checkout.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-flex rounded-xl bg-emerald-950 px-5 py-3 text-sm font-bold text-white"
        >
          Browse products
        </Link>
      </div>
    );
  }

  if (addresses.length === 0) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
        <h2 className="text-xl font-black text-amber-950">
          Add a delivery address first
        </h2>
        <p className="mt-2 text-sm text-amber-900">
          Checkout needs one of your saved addresses.
        </p>
        <Link
          href="/account/addresses"
          className="mt-5 inline-flex rounded-xl bg-amber-950 px-5 py-3 text-sm font-bold text-white"
        >
          Manage addresses
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={submitOrder}
      className="grid gap-8 lg:grid-cols-[1fr_22rem]"
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-emerald-950/10 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-black text-emerald-950">
            Delivery address
          </h2>
          <div className="mt-4 space-y-3">
            {addresses.map((address) => (
              <label
                key={address.id}
                className="flex cursor-pointer gap-3 rounded-xl border p-4 has-checked:border-emerald-700 has-checked:bg-emerald-50"
              >
                <input
                  type="radio"
                  name="deliveryAddressId"
                  value={address.id}
                  defaultChecked={
                    address.id === (defaultAddress?.id ?? addresses[0]?.id)
                  }
                  required
                />
                <span>
                  <span className="block font-bold text-emerald-950">
                    {address.label}
                  </span>
                  <span className="mt-1 block text-sm text-neutral-600">
                    {address.address}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-emerald-950/10 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-black text-emerald-950">
            Review products
          </h2>
          <div className="mt-4 divide-y">
            {items.map((item) => (
              <div
                key={item.id}
                data-testid="checkout-item"
                className="flex justify-between gap-4 py-4"
              >
                <div>
                  <p className="font-bold text-emerald-950">{item.name}</p>
                  <p className="text-sm text-neutral-500">
                    Quantity {item.quantity}
                  </p>
                </div>
                <p className="font-semibold text-emerald-950">
                  LKR {item.price} each
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-emerald-950/10 bg-white p-5 shadow-sm sm:p-6">
          <label
            htmlFor="deliveryInstructions"
            className="text-base font-bold text-emerald-950"
          >
            Delivery instructions{" "}
            <span className="font-normal">(optional)</span>
          </label>
          <textarea
            id="deliveryInstructions"
            name="deliveryInstructions"
            maxLength={1000}
            rows={4}
            placeholder="Gate code, landmark, or delivery note"
            className="mt-3 w-full rounded-xl border p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-700"
          />
        </section>
      </div>

      <aside className="h-fit rounded-2xl border border-emerald-950/10 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-emerald-950">Order summary</h2>
        <dl className="mt-6 space-y-4 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd data-testid="checkout-subtotal">LKR {quotedSubtotal}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Delivery fee</dt>
            <dd data-testid="checkout-delivery-fee">
              {deliveryFee
                ? `LKR ${deliveryFee}`
                : "Calculated at confirmation"}
            </dd>
          </div>
          <div className="flex justify-between border-t pt-4 text-base font-black text-emerald-950">
            <dt>Total</dt>
            <dd data-testid="checkout-total">
              {total ? `LKR ${total}` : "Calculated at confirmation"}
            </dd>
          </div>
        </dl>
        <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm">
          <span className="block font-bold text-amber-950">Payment method</span>
          <span className="mt-1 block text-amber-900">Cash on Delivery</span>
        </div>
        <p className="mt-4 text-xs leading-5 text-neutral-500">
          Prices, availability, stock, delivery fee, and total are recalculated
          by the server when you confirm.
        </p>
        {error ? (
          <p className="mt-4 text-sm font-semibold text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full rounded-xl bg-emerald-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? "Placing order…" : "Confirm Cash on Delivery order"}
        </button>
      </aside>
    </form>
  );
}
