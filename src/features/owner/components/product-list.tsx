"use client";
import { BilingualText } from "@/features/i18n/components/bilingual-text";
import { useLocale, useText } from "@/features/i18n/components/locale-provider";
import { Text } from "@/features/i18n/components/text";

import { useState, type FormEvent } from "react";
import { CircleCheck, CircleX, Pencil, Save } from "lucide-react";

import Link from "next/link";

import { FormError } from "@/features/auth/components/form-fields";
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
  onToggleAvailability: () => void;
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
    <form className="mt-auto flex flex-wrap items-end gap-2 border-t border-border pt-4" onSubmit={handleSubmit}>
      <Label
        className="order-1 w-full text-xs font-medium @min-[420px]/product-card:order-2 @min-[420px]/product-card:w-36"
        htmlFor={`threshold-${product.id}`}
      >
        <Text value={"Low-stock threshold "} />
        <Input
          id={`threshold-${product.id}`}
          name="lowStockThreshold"
          type="number"
          min="0"
          step="1"
          defaultValue={product.lowStockThreshold}
          className="mt-1 block h-9 w-full"
          required
        />
      </Label>
      <Label
        className="order-2 w-20 text-xs font-medium @min-[420px]/product-card:order-1"
        htmlFor={`stock-${product.id}`}
      >
        <Text value={"Stock "} />
        <Input
          id={`stock-${product.id}`}
          name="stockQuantity"
          type="number"
          min="0"
          step="1"
          defaultValue={product.stockQuantity}
          className="mt-1 block h-9 w-full"
          required
        />
      </Label>
      <div className="order-3 flex items-center gap-2">
        <IconActionButton
          variant="success"
          size="icon-sm"
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
                className={buttonVariants({ variant: "outline", size: "icon-sm" })}
                aria-label={editLabel}
              >
                <Pencil aria-hidden="true" />
              </Link>
            }
          />
          <TooltipContent>{editLabel}</TooltipContent>
        </Tooltip>
        <IconActionButton
          variant={product.isAvailable ? "destructive" : "success"}
          className={product.isAvailable ? "text-white [html.dark_&]:text-black" : undefined}
          size="icon-sm"
          type="button"
          label={`${t(product.isAvailable ? "Mark unavailable" : "Mark available")} ${productName}`}
          disabled={availabilityPending}
          onClick={onToggleAvailability}
        >
          {product.isAvailable ? (
            <CircleX aria-hidden="true" className="stroke-white [html.dark_&]:stroke-black" />
          ) : (
            <CircleCheck aria-hidden="true" />
          )}
        </IconActionButton>
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
  const [products, setProducts] = useState(initialProducts);
  const [pendingId, setPendingId] = useState<string>();
  const [error, setError] = useState<string>();

  function saveProduct(saved: ProductView) {
    setProducts((current) =>
      current.map((product) => (product.id === saved.id ? saved : product)),
    );
  }

  async function toggleAvailability(product: ProductView) {
    setError(undefined);
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
      setError(t(payload.error?.message ?? "Unable to update availability."));
    } else {
      const payload = await readPayload(response);
      if (payload.data) saveProduct(payload.data);
    }
    setPendingId(undefined);
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
      {error ? <FormError>{error}</FormError> : null}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {products.map((product) => (
          <Card as="article" key={product.id} className="@container/product-card gap-0 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
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
                {product.imageUrl ? (
                  <a
                    href={product.imageUrl}
                    rel="noreferrer"
                    target="_blank"
                    className="mt-2 inline-block text-xs text-primary hover:underline"
                  >
                    <Text value={"View image "} />
                  </a>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant="secondary">
                  {product.isAvailable ? t("Available") : t("Unavailable")}
                </Badge>
                <Badge variant="warning" data-testid="inventory-status">
                  {product.inventoryStatus === "OUT_OF_STOCK"
                    ? t("Out of stock")
                    : product.inventoryStatus === "LOW_STOCK"
                      ? t("Low stock")
                      : t("In stock")}
                </Badge>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">
                  <Text value={t("Price")} />
                </dt>
                <dd className="font-medium">{product.price}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  <Text value={t("Stock")} />
                </dt>
                <dd className="font-medium">{product.stockQuantity}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  <Text value={t("Low-stock threshold")} />
                </dt>
                <dd className="font-medium">{product.lowStockThreshold}</dd>
              </div>
            </dl>
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
