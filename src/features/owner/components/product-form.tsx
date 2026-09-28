"use client";

import { useMemo, useState, type FormEvent } from "react";

import { useRouter } from "next/navigation";

import {
  FormError,
  FormField,
  SelectField,
} from "@/features/auth/components/form-fields";
import type {
  ProductFormOptions,
  ProductView,
} from "@/services/product.service";

interface ApiPayload {
  error?: { message?: string };
}

export function ProductForm({
  options,
  product,
}: {
  options: ProductFormOptions;
  product?: ProductView;
}) {
  const router = useRouter();
  const initialShopId = product?.shopId ?? options.shops[0]?.id ?? "";
  const [shopId, setShopId] = useState(initialShopId);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const categories = useMemo(
    () => options.categories.filter((category) => category.shopId === shopId),
    [options.categories, shopId],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch(
      product ? `/api/owner/products/${product.id}` : "/api/owner/products",
      {
        method: product ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(!product ? { shopId } : {}),
          categoryId: form.get("categoryId"),
          nameEn: form.get("nameEn"),
          nameSi: form.get("nameSi"),
          descriptionEn: form.get("descriptionEn"),
          descriptionSi: form.get("descriptionSi"),
          price: form.get("price"),
          stockQuantity: form.get("stockQuantity"),
          imageUrl: form.get("imageUrl"),
          isAvailable: form.get("isAvailable") === "on",
        }),
      },
    ).catch(() => null);

    if (!response?.ok) {
      const payload = response
        ? ((await response.json().catch(() => ({}))) as ApiPayload)
        : {};
      setError(payload.error?.message ?? "Unable to save this product.");
      setPending(false);
      return;
    }

    router.push("/owner/products");
    router.refresh();
  }

  return (
    <form className="mt-8 max-w-3xl space-y-5" onSubmit={handleSubmit}>
      {product ? (
        <div>
          <p className="text-sm font-medium">Shop</p>
          <p className="mt-1.5 text-sm text-neutral-600">{product.shopName}</p>
        </div>
      ) : (
        <SelectField
          id="shopId"
          name="shopId"
          label="Shop"
          value={shopId}
          onChange={(event) => setShopId(event.target.value)}
          required
        >
          {options.shops.map((shop) => (
            <option key={shop.id} value={shop.id}>
              {shop.name}
            </option>
          ))}
        </SelectField>
      )}
      <SelectField
        id="categoryId"
        name="categoryId"
        label="Category"
        defaultValue={product?.categoryId ?? categories[0]?.id ?? ""}
        key={`${shopId}-${product?.categoryId ?? "new"}`}
        required
      >
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.nameEn}
            {category.status === "INACTIVE" ? " (inactive)" : ""}
          </option>
        ))}
      </SelectField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="nameEn"
          name="nameEn"
          label="English name"
          defaultValue={product?.nameEn ?? ""}
          maxLength={180}
          required
        />
        <FormField
          id="nameSi"
          name="nameSi"
          label="Sinhala name"
          defaultValue={product?.nameSi ?? ""}
          maxLength={180}
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium" htmlFor="descriptionEn">
          English description
          <textarea
            id="descriptionEn"
            name="descriptionEn"
            defaultValue={product?.descriptionEn ?? ""}
            maxLength={5000}
            className="mt-1.5 min-h-28 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="descriptionSi">
          Sinhala description
          <textarea
            id="descriptionSi"
            name="descriptionSi"
            defaultValue={product?.descriptionSi ?? ""}
            maxLength={5000}
            className="mt-1.5 min-h-28 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="price"
          name="price"
          label="Price"
          type="number"
          min="0"
          max="9999999999.99"
          step="0.01"
          defaultValue={product?.price ?? "0.00"}
          required
        />
        <FormField
          id="stockQuantity"
          name="stockQuantity"
          label="Stock quantity"
          type="number"
          min="0"
          max="2147483647"
          step="1"
          defaultValue={product?.stockQuantity ?? 0}
          required
        />
      </div>
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
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          name="isAvailable"
          type="checkbox"
          defaultChecked={product?.isAvailable ?? true}
        />
        Product is available
      </label>
      {categories.length === 0 ? (
        <FormError>Create a category for this shop first.</FormError>
      ) : null}
      {error ? <FormError>{error}</FormError> : null}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending || categories.length === 0}
          className="h-10 rounded-md bg-neutral-950 px-5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : product ? "Save product" : "Create product"}
        </button>
        <button
          type="button"
          className="h-10 rounded-md border px-5 text-sm font-medium"
          onClick={() => router.push("/owner/products")}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
