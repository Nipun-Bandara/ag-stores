"use client";

import { useState, type FormEvent } from "react";

import Link from "next/link";

import { FormError } from "@/features/auth/components/form-fields";
import type { ProductView } from "@/services/product.service";

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
}: {
  product: ProductView;
  onSaved: (product: ProductView) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

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
      setError(payload.error?.message ?? "Unable to update inventory.");
    }
    setPending(false);
  }

  return (
    <form
      className="mt-4 flex flex-wrap items-end gap-2"
      onSubmit={handleSubmit}
    >
      <label className="text-xs font-medium" htmlFor={`stock-${product.id}`}>
        Stock
        <input
          id={`stock-${product.id}`}
          name="stockQuantity"
          type="number"
          min="0"
          step="1"
          defaultValue={product.stockQuantity}
          className="mt-1 block h-9 w-28 rounded-md border px-3 text-sm"
          required
        />
      </label>
      <label
        className="text-xs font-medium"
        htmlFor={`threshold-${product.id}`}
      >
        Low-stock threshold
        <input
          id={`threshold-${product.id}`}
          name="lowStockThreshold"
          type="number"
          min="0"
          step="1"
          defaultValue={product.lowStockThreshold}
          className="mt-1 block h-9 w-36 rounded-md border px-3 text-sm"
          required
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-md border px-3 text-xs font-medium"
      >
        {pending ? "Updating…" : "Update stock"}
      </button>
      {error ? (
        <p role="alert" className="w-full text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export function ProductList({
  initialProducts,
}: {
  initialProducts: ProductView[];
}) {
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
      setError(payload.error?.message ?? "Unable to update availability.");
    } else {
      const payload = await readPayload(response);
      if (payload.data) saveProduct(payload.data);
    }
    setPendingId(undefined);
  }

  if (products.length === 0) {
    return (
      <p className="mt-6 rounded-xl border p-6 text-sm text-neutral-600">
        No products match the current filters.
      </p>
    );
  }

  return (
    <div className="mt-6">
      {error ? <FormError>{error}</FormError> : null}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {products.map((product) => (
          <article key={product.id} className="rounded-xl border p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">{product.nameEn}</h2>
                <p className="mt-1 text-sm text-neutral-600">
                  {product.categoryName} · {product.shopName}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium">
                  {product.isAvailable ? "Available" : "Unavailable"}
                </span>
                <span
                  data-testid="inventory-status"
                  className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900"
                >
                  {product.inventoryStatus === "OUT_OF_STOCK"
                    ? "Out of stock"
                    : product.inventoryStatus === "LOW_STOCK"
                      ? "Low stock"
                      : "In stock"}
                </span>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-neutral-500">Price</dt>
                <dd className="font-medium">{product.price}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Stock</dt>
                <dd className="font-medium">{product.stockQuantity}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Low-stock threshold</dt>
                <dd className="font-medium">{product.lowStockThreshold}</dd>
              </div>
            </dl>
            <StockForm product={product} onSaved={saveProduct} />
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium">
              <Link href={`/owner/products/${product.id}/edit`}>
                Edit {product.nameEn}
              </Link>
              <button
                type="button"
                disabled={pendingId === product.id}
                onClick={() => toggleAvailability(product)}
              >
                {product.isAvailable ? "Mark unavailable" : "Mark available"}
              </button>
              {product.imageUrl ? (
                <a href={product.imageUrl} rel="noreferrer" target="_blank">
                  View image
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
