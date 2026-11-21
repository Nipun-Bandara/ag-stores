"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useText } from "@/features/i18n/components/locale-provider";
import { ProductCard } from "@/features/storefront/components/product-card";
import {
  appendUnique,
  arrivedByHistoryNavigation,
  catalogKey,
  clearCatalogSnapshot,
  readCatalogSnapshot,
  writeCatalogSnapshot,
} from "@/features/storefront/catalog-session";
import type { Locale } from "@/lib/i18n/config";
import type { StorefrontProductView } from "@/services/storefront.service";

interface ProductPagePayload {
  data?: {
    products: StorefrontProductView[];
    page: number;
    pageCount: number;
  };
}

type Status = "idle" | "loading" | "error";

/**
 * Phone-only continuation of a server-rendered catalogue page: as the shopper
 * nears the end of the list, the next page is fetched and appended. Larger
 * screens hide this and keep the numbered pagination. A "Load more" button
 * stays available for keyboard and screen-reader users.
 */
export function InfiniteProductList({
  initialPage,
  pageCount,
  pageSize,
  initialProductIds,
  search,
  categoryId,
  locale,
  localizedRoute,
}: {
  initialPage: number;
  pageCount: number;
  pageSize: number;
  initialProductIds: string[];
  search?: string | undefined;
  categoryId?: string | undefined;
  locale: Locale;
  localizedRoute: boolean;
}) {
  const t = useText();
  const key = catalogKey({ search, categoryId, pageSize });
  const [products, setProducts] = useState<StorefrontProductView[]>([]);
  const [lastPage, setLastPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(pageCount);
  const [status, setStatus] = useState<Status>("idle");
  const [restored, setRestored] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const pendingScroll = useRef<number | null>(null);
  const hasMore = lastPage < totalPages;
  // Snapshots continue from the first page only; a deep link keeps its page.
  const resumable = initialPage === 1;

  // Back from a product page: put the earlier pages and scroll position back.
  // sessionStorage only exists in the browser, so this must run after
  // hydration; reading it during render would mismatch the server HTML.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!resumable) return;
    const snapshot = arrivedByHistoryNavigation()
      ? readCatalogSnapshot(key)
      : null;
    if (snapshot && snapshot.lastPage > initialPage) {
      setProducts(
        appendUnique([], snapshot.products, new Set(initialProductIds)),
      );
      setLastPage(Math.min(snapshot.lastPage, pageCount));
      pendingScroll.current = snapshot.scrollY;
    } else {
      clearCatalogSnapshot(key);
    }
    setRestored(true);
    // Only on arrival; later prop changes come with a new key and remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (pendingScroll.current === null) return;
    const target = pendingScroll.current;
    pendingScroll.current = null;
    // Wait for the restored cards to lay out before scrolling to them.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => window.scrollTo({ top: target })),
    );
  }, [products]);

  // Keep the snapshot current with what is shown and how far down we are.
  useEffect(() => {
    if (!restored || !resumable || products.length === 0) return;
    const save = () =>
      writeCatalogSnapshot(key, {
        products,
        lastPage,
        scrollY: window.scrollY,
        savedAt: Date.now(),
      });
    save();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(save, 200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", save);
    return () => {
      clearTimeout(timer);
      save();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", save);
    };
  }, [key, products, lastPage, restored, resumable]);

  const loadMore = useCallback(async () => {
    if (status === "loading" || !hasMore) return;
    setStatus("loading");
    const query = new URLSearchParams({
      page: String(lastPage + 1),
      pageSize: String(pageSize),
    });
    if (search) query.set("search", search);
    if (categoryId) query.set("categoryId", categoryId);
    try {
      const response = await fetch(`/api/storefront/products?${query}`);
      const payload = (await response.json()) as ProductPagePayload;
      if (!response.ok || !payload.data) throw new Error("load failed");
      const { data } = payload;
      setProducts((current) =>
        appendUnique(current, data.products, new Set(initialProductIds)),
      );
      setTotalPages(data.pageCount);
      // The API clamps past-the-end requests to the last page.
      setLastPage(data.page > lastPage ? data.page : data.pageCount);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, [
    status,
    hasMore,
    lastPage,
    pageSize,
    search,
    categoryId,
    initialProductIds,
  ]);

  // Start loading a little before the shopper reaches the end of the list.
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !restored || !hasMore || status !== "idle") return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [restored, hasMore, status, loadMore]);

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
        {status === "loading" ? (
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
