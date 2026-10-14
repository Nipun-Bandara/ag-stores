"use client";
import { useLocale, useText } from "@/features/i18n/components/locale-provider";
import { Text } from "@/features/i18n/components/text";
import { BilingualText } from "@/features/i18n/components/bilingual-text";

import { useState } from "react";

import Link from "next/link";

import { useCart } from "@/features/cart/cart-store";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { localizeBilingual } from "@/lib/i18n/config";

interface ValidationPayload {
  data?: { subtotal?: string };
  error?: { message?: string };
}

export function CartView() {
  const t = useText();
  const locale = useLocale();
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
        ? t("Current server-verified subtotal: LKR {amount}", {
            amount: payload.data.subtotal,
          })
        : t(payload.error?.message ?? "Unable to validate your cart."),
    );
    setPending(false);
  }

  if (items.length === 0) {
    return (
      <Card className="gap-0 border-dashed p-10 text-center border ring-0">
        <h2 className="text-xl font-black text-foreground">
          <Text value={"Your cart is empty "} />
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          <Text value={"Browse the storefront to find something you need. "} />
        </p>
        <Link
          href="/products"
          className={buttonVariants({
            variant: "default",
            className: "mt-6 inline-flex",
          })}
        >
          <Text value={"Browse products "} />
        </Link>
      </Card>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <section aria-label={t("Cart items")} className="space-y-4">
        {items.map((item) => (
          <Card
            as="article"
            key={item.id}
            data-testid="cart-item"
            className="gap-0 grid gap-4 p-4 sm:grid-cols-[5rem_1fr_auto] sm:items-center"
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
            <div className="min-w-0">
              <h2 className="break-words font-bold text-foreground">
                <BilingualText
                  english={item.nameEn ?? item.name}
                  sinhala={item.nameSi ?? null}
                />
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                LKR {item.price} <Text value={"each · "} />
                {item.stockQuantity} <Text value={"available "} />
              </p>
              <Button
                variant="ghost"
                type="button"
                onClick={() => remove(item.id)}
                className="mt-3 underline underline-offset-4"
                aria-label={t("Remove {name}", {
                  name: localizeBilingual(
                    item.nameEn ?? item.name,
                    item.nameSi ?? null,
                    locale,
                  ),
                })}
              >
                <Text value={"Remove "} />
              </Button>
            </div>
            <Label className="text-sm font-semibold text-foreground">
              <Text value={"Quantity "} />
              <Input
                aria-label={t("Quantity for {name}", {
                  name: localizeBilingual(
                    item.nameEn ?? item.name,
                    item.nameSi ?? null,
                    locale,
                  ),
                })}
                type="number"
                min={1}
                max={item.stockQuantity}
                value={item.quantity}
                onChange={(event) =>
                  updateQuantity(item.id, Number(event.currentTarget.value))
                }
                className="mt-1 block h-10 w-24"
              />
            </Label>
          </Card>
        ))}
      </section>
      <Card as="aside" className="gap-0 h-fit p-6">
        <h2 className="text-xl font-black text-foreground">
          <Text value={t("Summary")} />
        </h2>
        <div className="mt-6 flex justify-between border-b pb-5 font-bold text-foreground">
          <span>
            <Text value={t("Subtotal")} />
          </span>
          <span data-testid="cart-subtotal">LKR {subtotal}</span>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          <Text
            value={
              "Displayed prices are estimates. Availability and current database prices are checked by the server before checkout. "
            }
          />
        </p>
        <Button
          type="button"
          onClick={validateForCheckout}
          disabled={pending}
          className="mt-5 h-auto min-h-9 w-full whitespace-normal break-words py-2 text-center"
        >
          {pending ? t("Checking…") : t("Validate cart for checkout")}
        </Button>
        <Link
          href="/checkout"
          className={buttonVariants({
            variant: "outline",
            className:
              "mt-3 flex h-auto min-h-9 w-full justify-center whitespace-normal break-words py-2 text-center",
          })}
        >
          <Text value={"Proceed to checkout "} />
        </Link>
        {validationMessage ? (
          <Alert variant="success" className="mt-3" role="status">
            {validationMessage}
          </Alert>
        ) : null}
        <Button
          variant="ghost"
          type="button"
          onClick={clear}
          className="mt-4 w-full underline underline-offset-4"
        >
          <Text value={"Clear cart "} />
        </Button>
      </Card>
    </div>
  );
}
