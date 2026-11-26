"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useText } from "@/features/i18n/components/locale-provider";
import { ProductCard } from "@/features/storefront/components/product-card";
import {
  appendUnique,
  arrivedByHistoryNavigation,
  readCatalogScroll,
  saveCatalogScroll,
  urlWithLoadedPages,
} from "@/features/storefront/catalog-session";
import type { Locale } from "@/lib/i18n/config";
import { LOADED_PAGES_PARAM, parseLoadedPages } from "@/lib/product-pagination";
import type { StorefrontProductView } from "@/services/storefront.service";

interface ProductPagePayload {
  data?: {
    products: StorefrontProductView[];
    page: number;
    pageCount: number;
  };
}

type Status = "idle" | "loading" | "error" | "restoring";

/** Scrolls to a remembered offset once the restored cards have laid out. */
function applyPendingScroll(pending: { current: number | null }): void {
  const target = pending.current;
  if (target === null) return;
  pending.current = null;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => window.scrollTo({ top: target })),
  );
}

function currentPathAndQuery(): string {
  return `${window.location.pathname}${window.location.search}`;
}

/**
 * Phone-only continuation of a server-rendered catalogue page: as the shopper
 * nears the end of the list, the next page is fetched and appended. Larger
 * screens hide this and keep the numbered pagination. A "Load more" button
 * stays available for screen readers, keyboards and slow connections.
 *
 * The number of pages shown is written to the URL (`?loaded=N`). The server
 * renders those pages again on Back, refresh or a shared link and passes them
 * in as `initialProducts`; the scroll offset is restored on Back.
 */
export function InfiniteProductList({
  initialPage,
  initialLastPage = initialPage,
  initialProducts = [],
  pageCount,
  pageSize,
  initialProductIds,
  search,
  categoryId,
  locale,
  localizedRoute,
}: {
  initialPage: number;
  /** Last page already rendered by the server (from `?loaded=`). */
  initialLastPage?: number;
  /** Products on pages initialPage+1..initialLastPage. */
  initialProducts?: StorefrontProductView[];
  pageCount: number;
  pageSize: number;
  initialProductIds: string[];
  search?: string | undefined;
  categoryId?: string | undefined;
  locale: Locale;
  localizedRoute: boolean;
}) {
  const t = useText();
  const searchParams = useSearchParams();
  // `loaded` counts pages from the first; a deep link to ?page=3 keeps its page.
  const recordsInUrl = initialPage === 1;
  // Back can reuse the router's cached render from before more pages loaded,
  // so the URL may ask for more pages than the server rendered this time.
  const [wantedPages] = useState(() =>
    recordsInUrl
      ? parseLoadedPages(
          searchParams.get(LOADED_PAGES_PARAM) ?? undefined,
          initialPage,
          pageCount,
        )
      : initialLastPage,
  );
  const [products, setProducts] = useState(initialProducts);
  const [lastPage, setLastPage] = useState(initialLastPage);
  const [totalPages, setTotalPages] = useState(pageCount);
  const [status, setStatus] = useState<Status>(
    wantedPages > initialLastPage ? "restoring" : "idle",
  );
  const sentinel = useRef<HTMLDivElement>(null);
  const pendingScroll = useRef<number | null>(null);
  const hasMore = lastPage < totalPages;

  const fetchPage = useCallback(
    async (page: number) => {
      const query = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) query.set("search", search);
      if (categoryId) query.set("categoryId", categoryId);
      const response = await fetch(`/api/storefront/products?${query}`);
      const payload = (await response.json()) as ProductPagePayload;
      if (!response.ok || !payload.data) throw new Error("load failed");
      return payload.data;
    },
    [pageSize, search, categoryId],
  );

  // On arrival: fetch any pages the URL lists but this render lacks, then put
  // the scroll offset back if the shopper came here with Back.
  useEffect(() => {
    if (recordsInUrl && arrivedByHistoryNavigation()) {
      pendingScroll.current = readCatalogScroll(currentPathAndQuery());
    }
    if (wantedPages <= initialLastPage) {
      applyPendingScroll(pendingScroll);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const pages = await Promise.all(
          Array.from({ length: wantedPages - initialLastPage }, (_, index) =>
            fetchPage(initialLastPage + index + 1),
          ),
        );
        if (cancelled) return;
        const exclude = new Set(initialProductIds);
        setProducts((current) =>
          pages.reduce(
            (shown, page) => appendUnique(shown, page.products, exclude),
            current,
          ),
        );
        setTotalPages(pages.at(-1)?.pageCount ?? pageCount);
        setLastPage(wantedPages);
        setStatus("idle");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // Runs once per mount; a new filter or count remounts via the parent key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === "idle") applyPendingScroll(pendingScroll);
  }, [status]);

  // Remember how far down this URL was scrolled, for the next Back.
  useEffect(() => {
    if (!recordsInUrl) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = () => saveCatalogScroll(currentPathAndQuery(), window.scrollY);
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(save, 150);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", save);
    return () => {
      clearTimeout(timer);
      save();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", save);
    };
  }, [recordsInUrl]);

  const loadMore = useCallback(async () => {
    if (status === "loading" || status === "restoring" || !hasMore) return;
    setStatus("loading");
    try {
      const data = await fetchPage(lastPage + 1);
      // The API clamps past-the-end requests to the last page.
      const nextLastPage = data.page > lastPage ? data.page : data.pageCount;
      setProducts((current) =>
        appendUnique(current, data.products, new Set(initialProductIds)),
      );
      setTotalPages(data.pageCount);
      setLastPage(nextLastPage);
      setStatus("idle");
      if (recordsInUrl) {
        // Native history integrates with the Next.js router without a refetch.
        window.history.replaceState(
          null,
          "",
          urlWithLoadedPages(window.location.href, nextLastPage),
        );
      }
    } catch {
      setStatus("error");
    }
  }, [status, hasMore, lastPage, fetchPage, initialProductIds, recordsInUrl]);

  // Start loading a little before the shopper reaches the end of the list.
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore || status !== "idle") return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, status, loadMore]);

  if (pageCount <= initialPage && products.length === 0) return null;

  return (
    <div className="md:hidden" data-testid="infinite-product-list">
      {products.length > 0 ? (
        <div className="grid gap-x-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              locale={locale}
              localizedRoute={localizedRoute}
            />
          ))}
        </div>
      ) : null}
      <div ref={sentinel} aria-hidden className="h-px" />
      <div
        className="flex min-h-16 flex-col items-center justify-center gap-2 py-4 text-sm text-muted-foreground"
        aria-live="polite"
      >
        {status === "loading" || status === "restoring" ? (
          <span className="inline-flex items-center gap-2">
            <Spinner className="size-4" />
            {t("Loading more products…")}
          </span>
        ) : status === "error" ? (
          <>
            <span>{t("Couldn't load more products.")}</span>
            <Button variant="outline" size="sm" onClick={() => void loadMore()}>
              {t("Try again")}
            </Button>
          </>
        ) : hasMore ? (
          <Button variant="outline" size="sm" onClick={() => void loadMore()}>
            {t("Load more")}
          </Button>
        ) : (
          <span>{t("You've reached the end of the list.")}</span>
        )}
      </div>
    </div>
  );
}
