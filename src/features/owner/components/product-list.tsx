"use client";
import { toast } from "sonner";
import { ConfirmAction } from "@/components/ui/confirm-action";

import { ProductPrice } from "@/features/pricing/price-display";
import { firstOrderQuantity } from "@/lib/quantity";
import { BilingualText } from "@/features/i18n/components/bilingual-text";
import { useLocale, useText } from "@/features/i18n/components/locale-provider";
import { Text } from "@/features/i18n/components/text";

import { useState, type FormEvent } from "react";
import { CircleCheck, CircleX, Pencil, Save } from "lucide-react";

import Link from "next/link";

import type { ProductView } from "@/services/product.service";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { IconActionButton } from "@/components/ui/icon-action-button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { localizeBilingual } from "@/lib/i18n/config";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

interface ApiPayload {
  data?: ProductView;
  error?: { message?: string };
}

async function readPayload(response: Response): Promise<ApiPayload> {
  return (await response.json().catch(() => ({}))) as ApiPayload;
}

function StockForm({
  product,
  onSaved,
  onToggleAvailability,
  availabilityPending,
}: {
  product: ProductView;
  onSaved: (product: ProductView) => void;
  onToggleAvailability: () => Promise<boolean>;
  availabilityPending: boolean;
}) {
  const t = useText();
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const productName = localizeBilingual(product.nameEn, product.nameSi, locale);
  const editLabel = `${t("Edit")} ${productName}`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/owner/products/${product.id}/stock`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stockQuantity: form.get("stockQuantity"),
        lowStockThreshold: form.get("lowStockThreshold"),
      }),
    }).catch(() => null);
    if (response?.ok) {
      const payload = await readPayload(response);
      if (payload.data) onSaved(payload.data);
    } else {
      const payload = response ? await readPayload(response) : {};
      setError(t(payload.error?.message ?? "Unable to update inventory."));
    }
    setPending(false);
  }

  return (
    <form
      className="mt-auto flex flex-wrap items-end gap-2 border-t border-border pt-3"
      onSubmit={handleSubmit}
    >
      <Label
        className="order-1 w-full min-w-0 text-xs font-medium @min-[460px]/product-card:order-2 @min-[460px]/product-card:w-auto @min-[460px]/product-card:flex-1"
        htmlFor={`threshold-${product.id}`}
      >
        <Text value={"Low-stock threshold "} />
        <Input
          id={`threshold-${product.id}`}
          name="lowStockThreshold"
          type="number"
          min="0"
          step={product.sellingUnit === "KG" ? "0.001" : "1"}
          defaultValue={product.lowStockThreshold}
          className="mt-1 block h-9 w-full"
          required
        />
      </Label>
      <Label
        className="order-2 min-w-0 flex-1 text-xs font-medium @min-[460px]/product-card:order-1"
        htmlFor={`stock-${product.id}`}
      >
        <Text value={"Stock "} /> (
        {product.sellingUnit === "KG" ? "kg" : t("units")})
        <Input
          id={`stock-${product.id}`}
          name="stockQuantity"
          type="number"
          min="0"
          step={product.sellingUnit === "KG" ? "0.001" : "1"}
          defaultValue={product.stockQuantity}
          className="mt-1 block h-9 w-full"
          required
        />
      </Label>
      <div className="order-3 flex items-center gap-2">
        <IconActionButton
          variant="success"
          size="icon"
          type="submit"
          label={pending ? t("Updating…") : t("Update stock")}
          disabled={pending}
        >
          <Save aria-hidden="true" />
        </IconActionButton>
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href={`/owner/products/${product.id}/edit`}
                className={buttonVariants({
                  variant: "outline",
                  size: "icon",
                })}
                aria-label={editLabel}
              >
                <Pencil aria-hidden="true" />
              </Link>
            }
          />
          <TooltipContent>{editLabel}</TooltipContent>
        </Tooltip>
        <ConfirmAction
          title={t(
            product.isAvailable
              ? "Mark product unavailable"
              : "Mark product available",
          )}
          description={t(
            product.isAvailable
              ? "Mark {name} unavailable? Customers will no longer be able to add it to their cart."
              : "Make {name} available for customer orders again?",
            { name: productName },
          )}
          confirmLabel={t(
            product.isAvailable ? "Mark unavailable" : "Mark available",
          )}
          variant={product.isAvailable ? "destructive" : "success"}
          onConfirm={onToggleAvailability}
        >
          <IconActionButton
            variant={product.isAvailable ? "destructive" : "success"}
            className={
              product.isAvailable
                ? "text-white [html.dark_&]:text-black"
                : undefined
            }
            size="icon"
            type="button"
            label={`${t(product.isAvailable ? "Mark unavailable" : "Mark available")} ${productName}`}
            disabled={availabilityPending}
          >
            {product.isAvailable ? (
              <CircleX
                aria-hidden="true"
                className="stroke-white [html.dark_&]:stroke-black"
              />
            ) : (
              <CircleCheck aria-hidden="true" />
            )}
          </IconActionButton>
        </ConfirmAction>
      </div>
      {error ? (
        <Alert variant="destructive" role="alert" className="order-4 w-full">
          {error}
        </Alert>
      ) : null}
    </form>
  );
}

export function ProductList({
  initialProducts,
}: {
  initialProducts: ProductView[];
}) {
  const t = useText();
  const locale = useLocale();
  const [products, setProducts] = useState(initialProducts);
  const [pendingId, setPendingId] = useState<string>();

  function saveProduct(saved: ProductView) {
    setProducts((current) =>
      current.map((product) => (product.id === saved.id ? saved : product)),
    );
  }

  async function toggleAvailability(product: ProductView) {
    setPendingId(product.id);
    const response = await fetch(
      `/api/owner/products/${product.id}/availability`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !product.isAvailable }),
      },
    ).catch(() => null);

    if (!response?.ok) {
      const payload = response ? await readPayload(response) : {};
      toast.error(
        t(payload.error?.message ?? "Unable to update availability."),
      );
    } else {
      const payload = await readPayload(response);
      if (payload.data) {
        saveProduct(payload.data);
        toast.success(t("Product availability updated."));
      }
    }
    setPendingId(undefined);
    return Boolean(response?.ok);
  }

  if (products.length === 0) {
    return (
      <Empty className="mt-6">
        <EmptyHeader>
          <EmptyTitle>
            <Text value={"No products match the current filters. "} />
          </EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="mt-6">
      <div className="grid gap-4 xl:grid-cols-2">
        {products.map((product) => (
          <Card
            as="article"
            key={product.id}
            className="@container/product-card min-w-0 gap-3 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="break-words font-semibold">
                  <BilingualText
                    english={product.nameEn}
                    sinhala={product.nameSi}
                  />
                </h2>
                <p className="mt-1 break-words text-sm text-muted-foreground">
                  <BilingualText
                    english={product.categoryName}
                    sinhala={product.categoryNameSi}
                  />{" "}
                  · {product.shopName}
                </p>
                <ImageWithFallback
                  src={product.imageUrl}
                  alt={localizeBilingual(
                    product.nameEn,
                    product.nameSi,
                    locale,
                  )}
                  fallback={t("No photo")}
                  className="mt-2 aspect-square w-20 rounded-md border border-border"
                  sizes="80px"
                />
              </div>
              <div className="flex max-w-1/2 flex-col items-end gap-1.5">
                <Badge
                  variant="secondary"
                  className="max-w-full whitespace-normal"
                >
                  {product.isAvailable ? t("Available") : t("Unavailable")}
                </Badge>
                <Badge
                  variant={
                    product.inventoryStatus === "OUT_OF_STOCK"
                      ? "destructive"
                      : product.inventoryStatus === "LOW_STOCK"
                        ? "warning"
                        : "success"
                  }
                  className="max-w-full whitespace-normal"
                  data-testid="inventory-status"
                >
                  {product.inventoryStatus === "OUT_OF_STOCK"
                    ? t("Out of stock")
                    : product.inventoryStatus === "LOW_STOCK"
                      ? t("Low stock")
                      : t("In stock")}
                </Badge>
              </div>
            </div>
            <dl className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <div className="min-w-0">
                <dt className="text-muted-foreground">
                  <Text value="Item code" />
                </dt>
                <dd className="break-all font-medium">
                  {product.itemCode ?? t("Not set")}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground">
                  <Text value="Barcode (optional)" />
                </dt>
                <dd className="break-all font-medium">
                  {product.barcode ?? "—"}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap items-end justify-between gap-2 text-sm">
              <ProductPrice
                regularPrice={product.price}
                quantity={firstOrderQuantity(product)}
                discountTiers={product.discountTiers}
                sellingUnit={product.sellingUnit}
                locale={locale}
              />

              <p className="text-xs text-muted-foreground">
                <Text value="Minimum order quantity" />:{" "}
                {product.minimumOrderQuantity}{" "}
                <Text value={product.sellingUnit === "KG" ? "kg" : "units"} />
              </p>
            </div>
            <StockForm
              product={product}
              onSaved={saveProduct}
              onToggleAvailability={() => toggleAvailability(product)}
              availabilityPending={pendingId === product.id}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
