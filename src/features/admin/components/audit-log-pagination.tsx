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
import { auditLogPageSizes } from "@/validations/audit-log";

export function AuditLogPagination({
  page,
  pageSize,
  recordCount,
  hasPrevious,
  hasNext,
}: {
  page: number;
  pageSize: number;
  recordCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
}) {
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
    startTransition(() => router.push(href, { scroll: false }));
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
  const start = recordCount ? (page - 1) * pageSize + 1 : 0;
  const end = recordCount ? start + recordCount - 1 : 0;
  const previousHref = pageHref(Math.max(1, page - 1));
  const nextHref = pageHref(page + 1);
  const disabledClass =
    "size-10 aria-disabled:cursor-not-allowed aria-disabled:opacity-50";
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4 p-4"
      aria-busy={pending}
    >
      <div className="flex items-center gap-3">
        <Label htmlFor="audit-rows-per-page" className="whitespace-nowrap">
          {t("Rows per page")}
        </Label>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            if (value && Number(value) !== pageSize)
              navigate(pageHref(1, Number(value)));
          }}
          disabled={pending}
        >
          <SelectTrigger
            id="audit-rows-per-page"
            className="h-10 w-20 data-[size=default]:h-10"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            align="start"
            className="min-w-0"
          >
            {auditLogPageSizes.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <p
          className="text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {pending
            ? t("Loading records…")
            : recordCount
              ? t("Showing {start}–{end}", { start, end })
              : t("No records on this page")}
        </p>
        <Pagination
          className="mx-0 w-auto"
          aria-label={t("Audit log pagination")}
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
