"use client";
import { useLocale, useText } from "@/features/i18n/components/locale-provider";
import { Text } from "@/features/i18n/components/text";

import { useMemo, useState, type FormEvent } from "react";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { FormField } from "@/features/auth/components/form-fields";
import type {
  ProductFormOptions,
  ProductView,
} from "@/services/product.service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { localizeBilingual } from "@/lib/i18n/config";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

interface ApiPayload {
  data?: { id: string };
  error?: { message?: string };
}

export function ProductForm({
  options,
  product,
}: {
  options: ProductFormOptions;
  product?: ProductView;
}) {
  const t = useText();
  const locale = useLocale();
  const router = useRouter();
  const initialShopId = product?.shopId ?? options.shops[0]?.id ?? "";
  const initialCategoryId =
    product?.categoryId ??
    options.categories.find((category) => category.shopId === initialShopId)
      ?.id ??
    "";
  const [shopId, setShopId] = useState(initialShopId);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [sellingUnit, setSellingUnit] = useState<"UNIT" | "KG">(
    product?.sellingUnit ?? "UNIT",
  );
  const [pending, setPending] = useState(false);
  const categories = useMemo(
    () => options.categories.filter((category) => category.shopId === shopId),
    [options.categories, shopId],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch(
      product ? `/api/owner/products/${product.id}` : "/api/owner/products",
      {
        method: product ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(!product ? { shopId } : {}),
          itemCode: form.get("itemCode"),
          barcode: form.get("barcode"),
          sellingUnit,
          minimumOrderQuantity: product
            ? form.get("minimumOrderQuantity")
            : sellingUnit === "KG"
              ? 0.002
              : 1,
          orderingIncrement:
            sellingUnit === "KG"
              ? 0.001
              : product
                ? form.get("orderingIncrement")
                : 1,
          categoryId: form.get("categoryId"),
          nameEn: form.get("nameEn"),
          nameSi: form.get("nameSi"),
          descriptionEn: form.get("descriptionEn"),
          descriptionSi: form.get("descriptionSi"),
          price: form.get("price"),
          stockQuantity: form.get("stockQuantity"),
          lowStockThreshold: form.get("lowStockThreshold"),
          imageUrl: form.get("imageUrl"),
          isAvailable: form.get("isAvailable") === "on",
        }),
      },
    ).catch(() => null);

    const payload = response
      ? ((await response.json().catch(() => ({}))) as ApiPayload)
      : {};
    if (!response?.ok || !payload.data?.id) {
      toast.error(t(payload.error?.message ?? "Unable to save this product."));
      setPending(false);
      return;
    }

    toast.success(
      t(product ? "Product details saved." : "Product created successfully."),
    );
    router.push("/owner/products");
    router.refresh();
  }

  return (
    <form
      className="mx-auto mt-8 grid w-full max-w-5xl gap-4 sm:grid-cols-6 lg:grid-cols-12"
      onSubmit={handleSubmit}
    >
      <h2 className="text-lg font-semibold sm:col-span-6 lg:col-span-12">
        <Text value="Product details" />
      </h2>
      {product ? (
        <div className="sm:col-span-3 lg:col-span-6">
          <p className="text-sm font-medium">
            <Text value={t("Shop")} />
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {product.shopName}
          </p>
        </div>
      ) : (
        <div className="min-w-0 sm:col-span-3 lg:col-span-6">
          <Label htmlFor="shopId" className="block text-sm font-medium">
            <Text value={"Shop"} />
          </Label>
          <Select
            name="shopId"
            value={shopId}
            onValueChange={(value) => {
              const nextShopId = value ?? "";
              setShopId(nextShopId);
              setCategoryId(
                options.categories.find(
                  (category) => category.shopId === nextShopId,
                )?.id ?? "",
              );
            }}
            required
          >
            <SelectTrigger
              id="shopId"
              className="mt-1.5 h-10 w-full data-[size=default]:h-10"
            >
              <SelectValue>
                {(value) =>
                  options.shops.find((shop) => shop.id === value)?.name ??
                  t("Select a shop")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} className="min-w-0">
              {options.shops.map((shop) => (
                <SelectItem key={shop.id} value={shop.id}>
                  {shop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="min-w-0 sm:col-span-3 lg:col-span-6">
        <Label htmlFor="categoryId" className="block text-sm font-medium">
          <Text value={"Category"} />
        </Label>
        <Select
          name="categoryId"
          value={categoryId}
          onValueChange={(value) => setCategoryId(value ?? "")}
          disabled={categories.length === 0}
          required
        >
          <SelectTrigger
            id="categoryId"
            className="mt-1.5 h-10 w-full data-[size=default]:h-10"
          >
            <SelectValue>
              {(value) => {
                const category = categories.find((item) => item.id === value);
                return category
                  ? `${localizeBilingual(category.nameEn, category.nameSi, locale)}${category.status === "INACTIVE" ? t(" (inactive)") : ""}`
                  : t("Select a category");
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="min-w-0">
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {localizeBilingual(category.nameEn, category.nameSi, locale)}
                {category.status === "INACTIVE" ? t(" (inactive)") : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0 sm:col-span-3 lg:col-span-6">
        <FormField
          id="nameEn"
          name="nameEn"
          label="English name"
          defaultValue={product?.nameEn ?? ""}
          maxLength={180}
          required
        />
      </div>
      <div className="min-w-0 sm:col-span-3 lg:col-span-6">
        <FormField
          id="nameSi"
          name="nameSi"
          label="Sinhala name"
          defaultValue={product?.nameSi ?? ""}
          maxLength={180}
        />
      </div>
      <div className="sm:col-span-3 lg:col-span-6">
        <FormField
          id="itemCode"
          name="itemCode"
          label="Item code"
          defaultValue={product?.itemCode ?? ""}
          maxLength={100}
          required
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
        />
      </div>
      <div className="sm:col-span-3 lg:col-span-6">
        <FormField
          id="barcode"
          name="barcode"
          label="Barcode (optional)"
          defaultValue={product?.barcode ?? ""}
          maxLength={100}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
        />
      </div>
      <h2 className="text-lg font-semibold sm:col-span-6 lg:col-span-12">
        <Text value="Selling setup" />
      </h2>
      <div className="min-w-0 sm:col-span-6 lg:col-span-4">
        <Label htmlFor="sellingUnit" className="block text-sm font-medium">
          <Text value="Selling unit" />
        </Label>
        <Select
          name="sellingUnit"
          value={sellingUnit}
          items={[
            {
              value: "UNIT",
              label: t("Whole units (including sealed packets)"),
            },
            { value: "KG", label: t("Kilograms (kg)") },
          ]}
          onValueChange={(value) => {
            if (value === "UNIT" || value === "KG") setSellingUnit(value);
          }}
        >
          <SelectTrigger
            id="sellingUnit"
            className="mt-1.5 h-10 w-full data-[size=default]:h-10"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="min-w-0">
            <SelectItem value="UNIT">
              {t("Whole units (including sealed packets)")}
            </SelectItem>
            <SelectItem value="KG">{t("Kilograms (kg)")}</SelectItem>
          </SelectContent>
        </Select>
        {product ? (
          <p className="mt-1 text-xs text-muted-foreground">
            <Text value="Selling unit can only change with zero stock and no active orders." />
          </p>
        ) : null}
      </div>
      <div className="min-w-0 sm:col-span-3 lg:col-span-4">
        <FormField
          key={`minimum-${sellingUnit}`}
          id="minimumOrderQuantity"
          name="minimumOrderQuantity"
          label="Minimum order quantity"
          type="number"
          min={sellingUnit === "KG" ? "0.002" : "1"}
          step={sellingUnit === "KG" ? "0.001" : "1"}
          defaultValue={
            product?.sellingUnit === sellingUnit
              ? product.minimumOrderQuantity
              : sellingUnit === "KG"
                ? 0.002
                : 1
          }
          readOnly={!product}
          required
        />
      </div>
      <div className="min-w-0 sm:col-span-3 lg:col-span-4">
        {sellingUnit === "KG" ? (
          <>
            <Label className="block text-sm font-medium">
              <Text value="Ordering increment" />
            </Label>
            <p className="mt-1.5 flex h-10 items-center text-sm text-muted-foreground">
              <Text value="Not applicable" />
            </p>
          </>
        ) : (
          <FormField
            key={`increment-${sellingUnit}`}
            id="orderingIncrement"
            name="orderingIncrement"
            label="Ordering increment"
            type="number"
            min="1"
            step="1"
            defaultValue={
              product?.sellingUnit === sellingUnit
                ? product.orderingIncrement
                : 1
            }
            readOnly={!product}
            required
          />
        )}
      </div>
      <h2 className="text-lg font-semibold sm:col-span-6 lg:col-span-12">
        <Text value="Price and inventory" />
      </h2>
      <div className="min-w-0 sm:col-span-2 lg:col-span-4">
        <FormField
          id="price"
          name="price"
          label={sellingUnit === "KG" ? "Price per kg" : "Price per unit"}
          type="number"
          min="0"
          max="9999999999.99"
          step="0.01"
          defaultValue={product?.price ?? "0.00"}
          required
        />
      </div>
      <div className="min-w-0 sm:col-span-2 lg:col-span-4">
        <FormField
          id="stockQuantity"
          name="stockQuantity"
          label="Stock quantity"
          type="number"
          min="0"
          max="2147483647"
          step={sellingUnit === "KG" ? "0.001" : "1"}
          defaultValue={product?.stockQuantity ?? 0}
          required
        />
      </div>
      <div className="min-w-0 sm:col-span-2 lg:col-span-4">
        <FormField
          id="lowStockThreshold"
          name="lowStockThreshold"
          label="Low-stock threshold"
          type="number"
          min="0"
          max="2147483647"
          step={sellingUnit === "KG" ? "0.001" : "1"}
          defaultValue={product?.lowStockThreshold ?? 5}
          required
        />
      </div>
      <h2 className="text-lg font-semibold sm:col-span-6 lg:col-span-12">
        <Text value="Optional details" />
      </h2>
      <Label
        className="block min-w-0 text-sm font-medium sm:col-span-3 lg:col-span-6"
        htmlFor="descriptionEn"
      >
        <Text value={"English description "} />
        <Textarea
          id="descriptionEn"
          name="descriptionEn"
          defaultValue={product?.descriptionEn ?? ""}
          maxLength={5000}
          className="mt-1.5 min-h-28 w-full"
        />
      </Label>
      <Label
        className="block min-w-0 text-sm font-medium sm:col-span-3 lg:col-span-6"
        htmlFor="descriptionSi"
      >
        <Text value={"Sinhala description "} />
        <Textarea
          id="descriptionSi"
          name="descriptionSi"
          defaultValue={product?.descriptionSi ?? ""}
          maxLength={5000}
          className="mt-1.5 min-h-28 w-full"
        />
      </Label>
      <div className="min-w-0 sm:col-span-6 lg:col-span-12">
        <FormField
          id="imageUrl"
          name="imageUrl"
          label="Image URL"
          type="url"
          defaultValue={product?.imageUrl ?? ""}
          maxLength={2048}
          placeholder="https://example.com/product.jpg"
          hint="Image uploads are not available yet. Provide a hosted image URL."
        />
      </div>
      <Label className="flex items-center gap-2 text-sm font-medium sm:col-span-6 lg:col-span-12">
        <Checkbox
          name="isAvailable"
          defaultChecked={product?.isAvailable ?? true}
        />
        <Text value={"Product is available "} />
      </Label>
      {categories.length === 0 ? (
        <div className="sm:col-span-6 lg:col-span-12">
          <p className="text-sm text-muted-foreground">
            <Text value={t("Create a category for this shop first.")} />
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3 sm:col-span-6 lg:col-span-12">
        <Button
          variant="success"
          type="submit"
          disabled={pending || categories.length === 0}
          className="h-10"
        >
          {pending
            ? t("Saving…")
            : product
              ? t("Save product")
              : t("Create product")}
        </Button>
        <Button
          variant="outline"
          type="button"
          className="h-10"
          onClick={() => router.push("/owner/products")}
        >
          <Text value={"Cancel "} />
        </Button>
      </div>
    </form>
  );
}
