"use client";

import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useText } from "@/features/i18n/components/locale-provider";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
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
import { LOADED_PAGES_PARAM } from "@/lib/product-pagination";

type Filters = { search: string; categoryId: string };

/**
 * Catalogue search. Nothing is applied while typing or choosing a category;
 * the shopper presses Search (or Enter) to run it.
 */
export function StorefrontFilters({
  categoryOptions,
  initialSearch,
  initialCategoryId,
  copy,
  searchLabel,
}: {
  categoryOptions: { value: string; label: string }[];
  initialSearch: string;
  initialCategoryId: string;
  copy: Pick<
    Dictionary["storefront"],
    "searchProducts" | "searchPlaceholder" | "category" | "allCategories"
  >;
  /** Text for the submit button; defaults to a translated "Search". */
  searchLabel?: string;
}) {
  const t = useText();
  const router = useRouter();
  const pathname = usePathname();
  const serverKey = JSON.stringify([initialSearch, initialCategoryId]);
  const [state, setState] = useState({
    values: { search: initialSearch, categoryId: initialCategoryId } as Filters,
    serverKey,
  });
  const [pending, startTransition] = useTransition();

  // Back/forward or a link changed the filters: show what the page now uses.
  if (state.serverKey !== serverKey) {
    setState({
      values: { search: initialSearch, categoryId: initialCategoryId },
      serverKey,
    });
  }

  function setValue(name: keyof Filters, value: string) {
    setState((current) => ({
      ...current,
      values: { ...current.values, [name]: value },
    }));
  }

  function apply() {
    const params = new URLSearchParams(window.location.search);
    for (const [name, value] of Object.entries(state.values)) {
      const normalized = value.trim();
      if (normalized) params.set(name, normalized);
      else params.delete(name);
    }
    params.delete("page");
    params.delete(LOADED_PAGES_PARAM);
    const query = params.toString();
    startTransition(() =>
      router.push(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      }),
    );
  }

  return (
    <form
      role="search"
      className="grid min-w-0 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:gap-4"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
    >
      <div className="min-w-0">
        <Label className="text-sm font-medium" htmlFor="search">
          {copy.searchProducts}
        </Label>
        <Input
          id="search"
          name="search"
          type="search"
          value={state.values.search}
          maxLength={180}
          placeholder={copy.searchPlaceholder}
          className="mt-1.5 h-10 w-full font-normal text-foreground placeholder:text-muted-foreground"
          onChange={(event) => setValue("search", event.currentTarget.value)}
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
          onValueChange={(value) => setValue("categoryId", value ?? "")}
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
      <Button
        type="submit"
        className="h-10 w-full sm:w-auto"
        disabled={pending}
      >
        {pending ? <Spinner className="size-4" /> : <Search aria-hidden />}
        {searchLabel ?? t("Search")}
      </Button>
    </form>
  );
}
