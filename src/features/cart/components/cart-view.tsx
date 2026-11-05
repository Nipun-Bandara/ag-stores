"use client";
import { useCartQuote } from "@/features/cart/use-cart-quote";
import { ProductPrice } from "@/features/pricing/price-display";
import { useLocale, useText } from "@/features/i18n/components/locale-provider";
import { Text } from "@/features/i18n/components/text";
import { BilingualText } from "@/features/i18n/components/bilingual-text";

import { Trash2 } from "lucide-react";

import Link from "next/link";

import { useCart } from "@/features/cart/cart-store";
import { Button, buttonVariants } from "@/components/ui/button";
import { IconActionButton } from "@/components/ui/icon-action-button";
import { CartQuantityInput } from "./cart-quantity-input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
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
  const { items, updateQuantity, remove, clear } = useCart();
  const { quote, quoteError, quotePending } = useCartQuote(items, "products");
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
      <section
        aria-label={t("Cart items")}
        aria-busy={quotePending}
        className="min-w-0 space-y-4"
      >
        {quotePending
          ? items.map((item) => <CartItemSkeleton key={item.id} />)
          : items.map((item) => {
              const name = localizeBilingual(
                item.nameEn ?? item.name,
                item.nameSi ?? null,
                locale,
              );
              const line = quote?.items.find(
                (entry) => entry.productId === item.id,
              );
              return (
                <Card
                  as="article"
                  key={item.id}
                  data-testid="cart-item"
                  className="min-w-0 gap-0 py-0"
                >
                  <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 p-4 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-5 sm:p-5">
                    <ImageWithFallback
                      src={item.imageUrl}
                      alt={name}
                      fallback={name.charAt(0)}
                      sizes="(min-width: 640px) 96px, 80px"
                      className="aspect-square w-20 rounded-lg sm:w-24"
                    />
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="min-w-0 break-words text-base font-semibold leading-snug text-foreground sm:text-lg">
                          <BilingualText
                            english={item.nameEn ?? item.name}
                            sinhala={item.nameSi ?? null}
                          />
                        </h2>
                        <IconActionButton
                          variant="destructive"
                          type="button"
                          onClick={() => remove(item.id)}
                          className="shrink-0 text-white [html.dark_&]:text-black"
                          label={t("Remove {name}", { name })}
                        >
                          <Trash2
                            aria-hidden="true"
                            className="stroke-white [html.dark_&]:stroke-black"
                          />
                        </IconActionButton>
                      </div>
                      <div className="mt-3 min-w-0 border-t border-border/60 pt-3 break-words">
                        {line ? (
                          <ProductPrice
                            regularPrice={line.regularPrice}
                            quantity={line.quantity}
                            discountTiers={line.discountTiers}
                            sellingUnit={line.sellingUnit}
                            locale={locale}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            <Text
                              value={
                                quotePending
                                  ? "Updating prices…"
                                  : "Prices unavailable. Review the cart before checkout."
                              }
                            />
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-4 border-t border-border/60 bg-muted/20 px-4 py-4 sm:px-5">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">
                        <Text value="Quantity" />
                      </p>
                      <CartQuantityInput
                        key={item.id}
                        item={item}
                        label={t("Quantity for {name}", { name })}
                        onChange={updateQuantity}
                      />
                    </div>
                    <div className="ml-auto min-w-0 text-right tabular-nums">
                      <p className="text-xs font-medium text-muted-foreground">
                        <Text value="Line total" />
                      </p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {line
                          ? `LKR ${line.lineTotal}`
                          : quotePending
                            ? t("Updating prices…")
                            : "—"}
                      </p>
                      {line?.savings && line.savings !== "0.00" ? (
                        <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          {t("Line savings")}: LKR {line.savings}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })}
      </section>
      <Card as="aside" className="h-fit min-w-0 gap-0 p-4 sm:p-5">
        {quoteError ? (
          <p role="alert" className="text-destructive">
            {t(quoteError)}
          </p>
        ) : null}
        <h2 className="text-lg font-semibold text-foreground">
          <Text value={t("Summary")} />
        </h2>
        <div className="mt-4 flex flex-wrap justify-between gap-2 border-b pb-3 font-bold text-foreground">
          <span>
            <Text value={t("Subtotal")} />
          </span>
          <span data-testid="cart-subtotal">
            {quote ? (
              `LKR ${quote.subtotal}`
            ) : quotePending ? (
              <Skeleton className="h-5 w-24" />
            ) : (
              "—"
            )}
          </span>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          <Text value={"Delivery fees are calculated at checkout."} />
        </p>
        <Link
          href="/checkout"
          className={buttonVariants({
            variant: "success",
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
          className="mt-3 w-full text-white no-underline [html.dark_&]:text-black"
        >
          <Text value={"Clear cart "} />
        </Button>
      </Card>
    </div>
  );
}

function CartItemSkeleton() {
  return (
    <Card className="min-w-0 gap-0 py-0" aria-hidden="true">
      <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 p-4 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-5 sm:p-5">
        <Skeleton className="size-20 rounded-lg sm:size-24" />
        <div className="min-w-0 space-y-3">
          <Skeleton className="h-6 w-2/3" />
          <div className="space-y-2 border-t border-border/60 pt-3">
            <Skeleton className="h-4 w-full max-w-56" />
            <Skeleton className="h-4 w-4/5 max-w-48" />
            <Skeleton className="h-4 w-3/5 max-w-40" />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-t border-border/60 bg-muted/20 p-4 sm:px-5">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            <Text value="Quantity" />
          </p>
          <Skeleton className="mt-1 h-11 w-28" />
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs font-medium text-muted-foreground">
            <Text value="Line total" />
          </p>
          <Skeleton className="mt-1 h-7 w-24" />
        </div>
      </div>
    </Card>
  );
}
