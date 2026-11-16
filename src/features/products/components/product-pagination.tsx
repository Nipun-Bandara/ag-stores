"use client";

import { useTransition, type MouseEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useText } from "@/features/i18n/components/locale-provider";
import {
  PRODUCT_PAGE_SIZES,
  type ProductPageInfo,
} from "@/lib/product-pagination";

export function ProductPagination({
  page,
  pageSize,
  total,
  pageCount,
  compact = false,
}: ProductPageInfo & { compact?: boolean }) {
  const hasPrevious = page > 1;
  const hasNext = page < pageCount;
  const t = useText();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  function pageHref(nextPage: number, nextSize = pageSize) {
    const query = new URLSearchParams(searchParams.toString());
    query.set("page", String(nextPage));
    query.set("pageSize", String(nextSize));
    return `${pathname}?${query}`;
  }
  function navigate(href: string) {
    startTransition(() => router.push(href, { scroll: true }));
  }
  function onPageClick(
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
    enabled: boolean,
  ) {
    if (!enabled || pending) {
      event.preventDefault();
      return;
    }
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    navigate(href);
  }
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);
  const previousHref = pageHref(Math.max(1, page - 1));
  const nextHref = pageHref(page + 1);
  const disabledClass =
    "size-10 aria-disabled:cursor-not-allowed aria-disabled:opacity-50";
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4 py-4"
      aria-busy={pending}
    >
      {!compact ? (
        <div className="flex items-center gap-3">
          <Label htmlFor="product-page-size" className="whitespace-nowrap">
            {t("Products per page")}
          </Label>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              if (value && Number(value) !== pageSize)
                navigate(pageHref(1, Number(value)));
            }}
            disabled={pending}
          >
            <SelectTrigger id="product-page-size" className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              align="start"
              className="min-w-0"
            >
              {PRODUCT_PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-3">
        <p
          className="text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {pending
            ? t("Loading products…")
            : total
              ? t("Showing {start}–{end} of {total}", { start, end, total })
              : t("No products match your selection.")}
        </p>
        <span className="text-xs text-muted-foreground">
          {t("Page {page} of {pages}", { page, pages: pageCount })}
        </span>
        <Pagination
          className="mx-0 w-auto"
          aria-label={t(
            compact ? "Product pagination, bottom" : "Product pagination",
          )}
        >
          <PaginationContent>
            <PaginationItem>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <PaginationPrevious
                      iconsOnly
                      href={hasPrevious && !pending ? previousHref : undefined}
                      aria-label={t("Previous page")}
                      aria-disabled={!hasPrevious || pending}
                      tabIndex={!hasPrevious || pending ? -1 : undefined}
                      className={disabledClass}
                      onClick={(event) =>
                        onPageClick(event, previousHref, hasPrevious)
                      }
                    />
                  }
                />
                <TooltipContent>{t("Previous page")}</TooltipContent>
              </Tooltip>
            </PaginationItem>
            <PaginationItem>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <PaginationNext
                      iconsOnly
                      href={hasNext && !pending ? nextHref : undefined}
                      aria-label={t("Next page")}
                      aria-disabled={!hasNext || pending}
                      tabIndex={!hasNext || pending ? -1 : undefined}
                      className={disabledClass}
                      onClick={(event) => onPageClick(event, nextHref, hasNext)}
                    />
                  }
                />
                <TooltipContent>{t("Next page")}</TooltipContent>
              </Tooltip>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
