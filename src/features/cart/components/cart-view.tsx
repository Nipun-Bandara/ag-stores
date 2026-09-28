"use client";

import { useState } from "react";

import Link from "next/link";

import { useCart } from "@/features/cart/cart-store";

interface ValidationPayload {
  data?: { subtotal?: string };
  error?: { message?: string };
}

export function CartView() {
  const { items, subtotal, updateQuantity, remove, clear } = useCart();
  const [validationMessage, setValidationMessage] = useState<string>();
  const [pending, setPending] = useState(false);

  async function validateForCheckout() {
    setPending(true);
    setValidationMessage(undefined);
    const response = await fetch("/api/checkout/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      }),
    }).catch(() => null);
    const payload = response
      ? ((await response.json().catch(() => ({}))) as ValidationPayload)
      : {};

    setValidationMessage(
      response?.ok && payload.data?.subtotal
        ? `Current server-verified subtotal: LKR ${payload.data.subtotal}`
        : (payload.error?.message ?? "Unable to validate your cart."),
    );
    setPending(false);
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-emerald-950/20 bg-white p-10 text-center">
        <h2 className="text-xl font-black text-emerald-950">
          Your cart is empty
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          Browse the storefront to find something you need.
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

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <section aria-label="Cart items" className="space-y-4">
        {items.map((item) => (
          <article
            key={item.id}
            data-testid="cart-item"
            className="grid gap-4 rounded-2xl border border-emerald-950/10 bg-white p-4 shadow-sm sm:grid-cols-[5rem_1fr_auto] sm:items-center"
          >
            <div
              className="flex aspect-square w-20 items-center justify-center rounded-xl bg-amber-100 bg-cover bg-center text-2xl font-black text-emerald-900/25"
              style={
                item.imageUrl
                  ? { backgroundImage: `url(${JSON.stringify(item.imageUrl)})` }
                  : undefined
              }
            >
              {!item.imageUrl ? item.name.charAt(0) : null}
            </div>
            <div>
              <h2 className="font-bold text-emerald-950">{item.name}</h2>
              <p className="mt-1 text-sm text-neutral-500">
                LKR {item.price} each · {item.stockQuantity} available
              </p>
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="mt-3 text-sm font-bold text-red-700 underline underline-offset-4"
                aria-label={`Remove ${item.name}`}
              >
                Remove
              </button>
            </div>
            <label className="text-sm font-semibold text-emerald-950">
              Quantity
              <input
                aria-label={`Quantity for ${item.name}`}
                type="number"
                min={1}
                max={item.stockQuantity}
                value={item.quantity}
                onChange={(event) =>
                  updateQuantity(item.id, Number(event.currentTarget.value))
                }
                className="mt-1 block h-10 w-24 rounded-lg border px-3"
              />
            </label>
          </article>
        ))}
      </section>
      <aside className="h-fit rounded-2xl border border-emerald-950/10 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-emerald-950">Summary</h2>
        <div className="mt-6 flex justify-between border-b pb-5 font-bold text-emerald-950">
          <span>Subtotal</span>
          <span data-testid="cart-subtotal">LKR {subtotal}</span>
        </div>
        <p className="mt-3 text-xs leading-5 text-neutral-500">
          Displayed prices are estimates. Availability and current database
          prices are checked by the server before checkout.
        </p>
        <button
          type="button"
          onClick={validateForCheckout}
          disabled={pending}
          className="mt-5 w-full rounded-xl bg-emerald-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? "Checking…" : "Validate cart for checkout"}
        </button>
        <Link
          href="/checkout"
          className="mt-3 flex w-full justify-center rounded-xl border border-emerald-950 px-5 py-3 text-sm font-bold text-emerald-950"
        >
          Proceed to checkout
        </Link>
        {validationMessage ? (
          <p
            className="mt-3 text-sm font-semibold text-emerald-800"
            role="status"
          >
            {validationMessage}
          </p>
        ) : null}
        <button
          type="button"
          onClick={clear}
          className="mt-4 w-full text-sm font-bold text-red-700 underline underline-offset-4"
        >
          Clear cart
        </button>
      </aside>
    </div>
  );
}
