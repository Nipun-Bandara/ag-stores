"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useText } from "@/features/i18n/components/locale-provider";
import type { ProductFormOptions } from "@/services/product.service";
import {
  ProductFilterSelects,
  type ProductFilterValues,
} from "./product-filter-selects";

type Filters = ProductFilterValues & { search: string };
function filterKey(values: Filters): string {
  return JSON.stringify([
    values.search.trim(),
    values.categoryId,
    values.inventoryStatus,
  ]);
}

export function ProductFilters({
  categories,
  initialSearch,
  initialCategoryId,
  initialInventoryStatus,
}: {
  categories: ProductFormOptions["categories"];
  initialSearch: string;
  initialCategoryId: string;
  initialInventoryStatus: string;
}) {
  const t = useText();
  const router = useRouter();
  const pathname = usePathname();
  const initialValues = {
    search: initialSearch,
    categoryId: initialCategoryId,
    inventoryStatus: initialInventoryStatus,
  };
  const serverKey = filterKey(initialValues);
  const [state, setState] = useState({
    values: initialValues,
    serverKey,
    requestedKey: null as string | null,
  });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  // Accept back/forward or external navigation without overwriting newer typing
  // when a response to this form's own navigation arrives.
  if (state.serverKey !== serverKey) {
    const ownResponse = serverKey === state.requestedKey;
    setState({
      values: ownResponse ? state.values : initialValues,
      serverKey,
      requestedKey: ownResponse ? state.requestedKey : null,
    });
  }

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (serverKey !== state.requestedKey) clearTimeout(timer.current);
  }, [serverKey, state.requestedKey]);

  function apply(values: Filters) {
    clearTimeout(timer.current);
    const key = filterKey(values);
    if (
      key === state.requestedKey ||
      (state.requestedKey === null && key === serverKey)
    )
      return;
    const params = new URLSearchParams(window.location.search);
    for (const [name, value] of Object.entries(values)) {
      const normalized = value.trim();
      if (normalized) params.set(name, normalized);
      else params.delete(name);
    }
    const query = params.toString();
    setState((current) => ({ ...current, requestedKey: key }));
    startTransition(() =>
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      }),
    );
  }

  return (
    <form
      className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        apply(state.values);
      }}
    >
      <Label className="min-w-0 text-sm font-medium" htmlFor="search">
        {t("Search")}
        <Input
          id="search"
          name="search"
          value={state.values.search}
          maxLength={180}
          placeholder={t("Name, description, item code or barcode")}
          className="mt-1.5 h-10 w-full"
          onChange={(event) => {
            const next = { ...state.values, search: event.currentTarget.value };
            setState((current) => ({ ...current, values: next }));
            clearTimeout(timer.current);
            timer.current = setTimeout(() => apply(next), 300);
          }}
        />
      </Label>
      <ProductFilterSelects
        categories={categories}
        initialCategoryId={initialCategoryId}
        initialInventoryStatus={initialInventoryStatus}
        value={state.values}
        onChange={(value) => {
          const next = { ...state.values, ...value };
          setState((current) => ({ ...current, values: next }));
          apply(next);
        }}
      />
    </form>
  );
}
