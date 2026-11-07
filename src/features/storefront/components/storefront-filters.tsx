"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Dictionary } from "@/lib/i18n/config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Filters = { search: string; categoryId: string };
function filterKey(values: Filters): string {
  return JSON.stringify([values.search.trim(), values.categoryId]);
}

export function StorefrontFilters({
  categoryOptions,
  initialSearch,
  initialCategoryId,
  copy,
}: {
  categoryOptions: { value: string; label: string }[];
  initialSearch: string;
  initialCategoryId: string;
  copy: Pick<
    Dictionary["storefront"],
    "searchProducts" | "searchPlaceholder" | "category" | "allCategories"
  >;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const initialValues = {
    search: initialSearch,
    categoryId: initialCategoryId,
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
      className="grid min-w-0 items-end gap-4 sm:grid-cols-2"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        apply(state.values);
      }}
    >
      <div className="min-w-0">
        <Label className="text-sm font-medium" htmlFor="search">
          {copy.searchProducts}
        </Label>
        <Input
          id="search"
          name="search"
          value={state.values.search}
          maxLength={180}
          placeholder={copy.searchPlaceholder}
          className="mt-1.5 h-10 w-full font-normal text-foreground placeholder:text-muted-foreground"
          onChange={(event) => {
            const next = { ...state.values, search: event.currentTarget.value };
            setState((current) => ({ ...current, values: next }));
            clearTimeout(timer.current);
            timer.current = setTimeout(() => apply(next), 300);
          }}
        />
      </div>
      <div className="min-w-0">
        <Label htmlFor="categoryId" className="text-sm font-medium">
          {copy.category}
        </Label>
        <Select
          name="categoryId"
          items={categoryOptions}
          value={state.values.categoryId}
          onValueChange={(value) => {
            const next = { ...state.values, categoryId: value ?? "" };
            setState((current) => ({ ...current, values: next }));
            apply(next);
          }}
        >
          <SelectTrigger
            id="categoryId"
            className={cn(
              "mt-1.5 h-10 w-full font-normal data-[size=default]:h-10",
              state.values.categoryId
                ? "text-foreground"
                : "text-muted-foreground",
            )}
          >
            <SelectValue>
              {(value) =>
                categoryOptions.find((option) => option.value === value)
                  ?.label ?? copy.allCategories
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </form>
  );
}
