import { LOADED_PAGES_PARAM } from "@/lib/product-pagination";
import type { StorefrontProductView } from "@/services/storefront.service";

/**
 * Phone catalogue restore. How many pages were loaded lives in the URL
 * (`?loaded=N`, rendered again by the server); only the scroll offset, which
 * depends on this device's layout, is kept in sessionStorage for this tab.
 */
const SCROLL_PREFIX = "ag-stores-catalog-scroll:";

let lastHistoryNavigationAt = 0;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    lastHistoryNavigationAt = Date.now();
  });
}

/** True when this page was reached with Back/Forward rather than a link. */
export function arrivedByHistoryNavigation(now = Date.now()): boolean {
  if (now - lastHistoryNavigationAt < 3000) return true;
  try {
    const entry = performance.getEntriesByType("navigation")[0] as
      PerformanceNavigationTiming | undefined;
    // A full page load via Back (no client-side router involved).
    return (
      entry?.type === "back_forward" &&
      now - performance.timeOrigin - entry.startTime < 3000
    );
  } catch {
    return false;
  }
}

/** The current URL with `loaded` set to the number of pages now shown. */
export function urlWithLoadedPages(href: string, loadedPages: number): string {
  const url = new URL(href);
  if (loadedPages > 1) {
    url.searchParams.set(LOADED_PAGES_PARAM, String(loadedPages));
  } else {
    url.searchParams.delete(LOADED_PAGES_PARAM);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function scrollKey(pathAndQuery: string): string {
  return `${SCROLL_PREFIX}${pathAndQuery}`;
}

export function saveCatalogScroll(pathAndQuery: string, scrollY: number): void {
  try {
    sessionStorage.setItem(
      scrollKey(pathAndQuery),
      String(Math.round(scrollY)),
    );
  } catch {
    // Storage blocked: Back still shows the pages, just from the top.
  }
}

export function readCatalogScroll(pathAndQuery: string): number | null {
  try {
    const value = Number(sessionStorage.getItem(scrollKey(pathAndQuery)));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

/** Appends a page, dropping products already shown (offsets can shift). */
export function appendUnique(
  existing: StorefrontProductView[],
  next: StorefrontProductView[],
  exclude: ReadonlySet<string> = new Set(),
): StorefrontProductView[] {
  const seen = new Set([...exclude, ...existing.map((product) => product.id)]);
  return [...existing, ...next.filter((product) => !seen.has(product.id))];
}
