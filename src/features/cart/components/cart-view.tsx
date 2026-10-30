"use client";
import { useLocale, useText } from "@/features/i18n/components/locale-provider";
import { Text } from "@/features/i18n/components/text";
import { BilingualText } from "@/features/i18n/components/bilingual-text";

import { Trash2 } from "lucide-react";

import Link from "next/link";

import { useCart } from "@/features/cart/cart-store";
import { Button, buttonVariants } from "@/components/ui/button";
import { IconActionButton } from "@/components/ui/icon-action-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { localizeBilingual } from "@/lib/i18n/config";

export function CartView() {
  const t = useText();
  const locale = useLocale();
  const { items, subtotal, updateQuantity, remove, clear } = useCart();
  if (items.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>
            <Text value={"Your cart is empty "} />
          </EmptyTitle>
          <EmptyDescription>
            <Text
              value={"Browse the storefront to find something you need. "}
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

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem]">
      <section aria-label={t("Cart items")} className="min-w-0 space-y-3">
        {items.map((item) => (
          <Card
            as="article"
            key={item.id}
            data-testid="cart-item"
            className="grid grid-cols-[4rem_minmax(0,1fr)] gap-3 p-4 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:items-center"
          >
            <div
              className="flex aspect-square w-16 items-center justify-center rounded-lg bg-muted bg-cover bg-center text-xl font-semibold text-muted-foreground"
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
            </div>
            <div className="col-span-2 flex items-end justify-between gap-3 sm:col-span-1 sm:justify-end">
              <Label className="text-xs font-medium text-muted-foreground">
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
                  className="mt-1 block h-9 w-20"
                />
              </Label>
              <IconActionButton
                variant="destructive"
                type="button"
                onClick={() => remove(item.id)}
                className="shrink-0 text-white [html.dark_&]:text-black"
                label={t("Remove {name}", {
                  name: localizeBilingual(
                    item.nameEn ?? item.name,
                    item.nameSi ?? null,
                    locale,
                  ),
                })}
              >
                <Trash2
                  aria-hidden="true"
                  className="stroke-white [html.dark_&]:stroke-black"
                />
              </IconActionButton>
            </div>
          </Card>
        ))}
      </section>
      <Card as="aside" className="h-fit min-w-0 gap-0 p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-foreground">
          <Text value={t("Summary")} />
        </h2>
        <div className="mt-4 flex flex-wrap justify-between gap-2 border-b pb-3 font-bold text-foreground">
          <span>
            <Text value={t("Subtotal")} />
          </span>
          <span data-testid="cart-subtotal">LKR {subtotal}</span>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          <Text value={"Delivery fees are calculated at checkout."} />
        </p>
        <Link
          href="/checkout"
          className={buttonVariants({
            className:
              "mt-3 flex h-auto min-h-9 w-full justify-center whitespace-normal break-words py-2 text-center",
          })}
        >
          <Text value={"Proceed to checkout "} />
        </Link>
        <Button
          variant="destructive"
          type="button"
          onClick={clear}
          className="mt-3 w-full no-underline"
        >
          <Text value={"Clear cart "} />
        </Button>
      </Card>
    </div>
  );
}
