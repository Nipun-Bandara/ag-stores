"use client";
import { useCartQuote } from "@/features/cart/use-cart-quote";
import { PriceSummary } from "@/features/pricing/price-display";
import { useLocale, useText } from "@/features/i18n/components/locale-provider";
import { Text } from "@/features/i18n/components/text";
import { BilingualText } from "@/features/i18n/components/bilingual-text";

import { useState, type FormEvent } from "react";

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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

interface CheckoutPayload {
  data?: { id?: string };
  error?: { message?: string };
}

export function CheckoutView({
  addresses,
}: {
  addresses: CustomerAddressView[];
}) {
  const t = useText();
  const router = useRouter();
  const locale = useLocale();
  const { items, clear } = useCart();
  const { quote, quoteError, quotePending } = useCartQuote(items);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const deliveryFee = quote?.deliveryFee;
  const total =
    quote && deliveryFee !== null && deliveryFee !== undefined
      ? minorUnitsToMoney(
          addMinorUnits(
            moneyToMinorUnits(quote.subtotal),
            moneyToMinorUnits(deliveryFee),
          ),
        )
      : null;
  const defaultAddress = addresses.find((address) => address.isDefault);

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quote || quoteError || quotePending) return;
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
          sellingUnit: item.sellingUnit ?? "UNIT",
        })),
      }),
    }).catch(() => null);
    const payload = response
      ? ((await response.json().catch(() => ({}))) as CheckoutPayload)
      : {};

    if (!response?.ok || !payload.data?.id) {
      setError(t(payload.error?.message ?? "Unable to place your order."));
      setPending(false);
      return;
    }

    clear();
    router.push(`/orders/${payload.data.id}`);
  }

  if (items.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>
            <Text value={"Your cart is empty "} />
          </EmptyTitle>
          <EmptyDescription>
            <Text
              value={"Add at least one available product before checkout. "}
            />
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href="/products" className={buttonVariants()}>
            <Text value={"Browse products "} />
          </Link>
        </EmptyContent>
      </Empty>
    );
  }

  if (addresses.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>
            <Text value={"Add a delivery address first "} />
          </EmptyTitle>
          <EmptyDescription>
            <Text value={"Checkout needs one of your saved addresses. "} />
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href="/account/addresses" className={buttonVariants()}>
            <Text value={"Manage addresses "} />
          </Link>
        </EmptyContent>
      </Empty>
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
            <Text value={"Delivery address "} />
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
                <span className="min-w-0 break-words">
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
            <Text value={"Review products "} />
          </h2>
          <div className="mt-4 divide-y">
            {!quote ? (
              <p role="status">
                {t(
                  quotePending
                    ? "Updating prices…"
                    : "Prices unavailable. Review the cart before checkout.",
                )}
              </p>
            ) : null}
            {quote?.items.map((item) => (
              <div
                key={item.productId}
                data-testid="checkout-item"
                className="flex justify-between gap-4 py-4"
              >
                <div className="min-w-0">
                  <p className="break-words font-bold text-foreground">
                    <BilingualText
                      english={item.name}
                      sinhala={item.nameSi ?? null}
                    />
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <Text value={"Quantity "} />
                    {item.quantity}
                    {item.sellingUnit === "KG" ? " kg" : ""}
                  </p>
                </div>
                <PriceSummary
                  pricing={item}
                  sellingUnit={item.sellingUnit}
                  locale={locale}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card as="section" className="gap-0 p-5 sm:p-6">
          <Label
            htmlFor="deliveryInstructions"
            className="text-base font-bold text-foreground"
          >
            <Text value={t("Delivery instructions")} />{" "}
            <span className="font-normal">
              <Text value={t("(optional)")} />
            </span>
          </Label>
          <Textarea
            id="deliveryInstructions"
            name="deliveryInstructions"
            maxLength={1000}
            rows={4}
            placeholder={t("Gate code, landmark, or delivery note")}
            className="mt-3 w-full p-3"
          />
        </Card>
      </div>

      <Card as="aside" className="gap-0 h-fit p-6">
        <h2 className="text-xl font-black text-foreground">
          <Text value={t("Order summary")} />
        </h2>
        <dl className="mt-6 space-y-4 text-sm">
          <div className="flex justify-between">
            <dt>
              <Text value={t("Subtotal")} />
            </dt>
            <dd data-testid="checkout-subtotal">
              {quote ? `LKR ${quote.subtotal}` : t("Updating prices…")}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>
              <Text value={t("Delivery fee")} />
            </dt>
            <dd data-testid="checkout-delivery-fee">
              {deliveryFee
                ? `LKR ${deliveryFee}`
                : t("Calculated at confirmation")}
            </dd>
          </div>
          <div className="flex justify-between border-t pt-4 text-base font-black text-foreground">
            <dt>
              <Text value={t("Total")} />
            </dt>
            <dd data-testid="checkout-total">
              {total ? `LKR ${total}` : t("Calculated at confirmation")}
            </dd>
          </div>
        </dl>
        <Card className="mt-6 gap-0 bg-muted/50 p-4">
          <span className="block font-bold">
            <Text value={t("Payment method")} />
          </span>
          <span className="mt-1 block text-muted-foreground">
            <Text value={"Cash on Delivery "} />
          </span>
        </Card>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          <Text
            value={
              "Prices, availability, stock, delivery fee, and total are recalculated by the server when you confirm. "
            }
          />
        </p>
        {error || quoteError ? (
          <Alert variant="destructive" className="mt-4" role="alert">
            {t(error ?? quoteError ?? "Unable to validate the cart.")}
          </Alert>
        ) : null}
        <Button
          variant="success"
          type="submit"
          disabled={pending || !quote || !!quoteError || quotePending}
          className="mt-6 h-auto min-h-9 w-full whitespace-normal break-words py-2 text-center"
        >
          {pending ? t("Placing order…") : t("Confirm Cash on Delivery order")}
        </Button>
      </Card>
    </form>
  );
}
