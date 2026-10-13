"use client";

import { useEffect, useState, type FormEvent } from "react";

import Link from "next/link";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useRouter } from "next/navigation";

import { useCart } from "@/features/cart/cart-store";
import {
  addMinorUnits,
  minorUnitsToMoney,
  moneyToMinorUnits,
} from "@/lib/money";
import type { CustomerAddressView } from "@/services/customer-address.service";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
      <Card className="gap-0 border-dashed p-10 text-center border ring-0">
        <h2 className="text-xl font-black text-foreground">
          Your cart is empty
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add at least one available product before checkout.
        </p>
        <Link
          href="/products"
          className={buttonVariants({
            variant: "default",
            className: "mt-6 inline-flex",
          })}
        >
          Browse products
        </Link>
      </Card>
    );
  }

  if (addresses.length === 0) {
    return (
      <Card className="gap-0 bg-amber-50 p-8">
        <h2 className="text-xl font-black text-amber-950">
          Add a delivery address first
        </h2>
        <p className="mt-2 text-sm text-amber-900">
          Checkout needs one of your saved addresses.
        </p>
        <Link
          href="/account/addresses"
          className={buttonVariants({
            variant: "default",
            className: "mt-5 inline-flex",
          })}
        >
          Manage addresses
        </Link>
      </Card>
    );
  }

  return (
    <form
      onSubmit={submitOrder}
      className="grid gap-8 lg:grid-cols-[1fr_22rem]"
    >
      <div className="space-y-6">
        <Card as="section" className="gap-0 p-5 sm:p-6">
          <h2 className="text-xl font-black text-foreground">
            Delivery address
          </h2>
          <RadioGroup
            className="mt-4"
            name="deliveryAddressId"
            defaultValue={defaultAddress?.id ?? addresses[0]?.id}
            required
          >
            {addresses.map((address) => (
              <Label
                key={address.id}
                className="flex cursor-pointer gap-3 rounded-xl border p-4 has-data-checked:border-primary has-data-checked:bg-primary/5"
              >
                <RadioGroupItem value={address.id} />
                <span>
                  <span className="block font-bold text-foreground">
                    {address.label}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {address.address}
                  </span>
                </span>
              </Label>
            ))}
          </RadioGroup>
        </Card>

        <Card as="section" className="gap-0 p-5 sm:p-6">
          <h2 className="text-xl font-black text-foreground">
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
                  <p className="font-bold text-foreground">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Quantity {item.quantity}
                  </p>
                </div>
                <p className="font-semibold text-foreground">
                  LKR {item.price} each
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card as="section" className="gap-0 p-5 sm:p-6">
          <Label
            htmlFor="deliveryInstructions"
            className="text-base font-bold text-foreground"
          >
            Delivery instructions{" "}
            <span className="font-normal">(optional)</span>
          </Label>
          <Textarea
            id="deliveryInstructions"
            name="deliveryInstructions"
            maxLength={1000}
            rows={4}
            placeholder="Gate code, landmark, or delivery note"
            className="mt-3 w-full p-3"
          />
        </Card>
      </div>

      <Card as="aside" className="gap-0 h-fit p-6">
        <h2 className="text-xl font-black text-foreground">Order summary</h2>
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
          <div className="flex justify-between border-t pt-4 text-base font-black text-foreground">
            <dt>Total</dt>
            <dd data-testid="checkout-total">
              {total ? `LKR ${total}` : "Calculated at confirmation"}
            </dd>
          </div>
        </dl>
        <Card className="mt-6 gap-0 bg-muted/50 p-4">
          <span className="block font-bold">Payment method</span>
          <span className="mt-1 block text-muted-foreground">
            Cash on Delivery
          </span>
        </Card>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Prices, availability, stock, delivery fee, and total are recalculated
          by the server when you confirm.
        </p>
        {error ? (
          <Alert variant="destructive" className="mt-4" role="alert">
            {error}
          </Alert>
        ) : null}
        <Button type="submit" disabled={pending} className="mt-6 w-full">
          {pending ? "Placing order…" : "Confirm Cash on Delivery order"}
        </Button>
      </Card>
    </form>
  );
}
