import type { StorefrontProductView } from "@/services/storefront.service";

/**
 * Remembers what the phone catalogue loaded while scrolling, so pressing Back
 * from a product page returns to the same spot instead of only the first page.
 * Stored per filter combination in sessionStorage (this tab only).
 */
export interface CatalogSnapshot {
  /** Products appended after the server-rendered page. */
  products: StorefrontProductView[];
  /** Last page loaded so far. */
  lastPage: number;
  scrollY: number;
  savedAt: number;
}

const PREFIX = "ag-stores-catalog:";
/** Older snapshots are ignored: prices and stock may have moved on. */
export const CATALOG_SNAPSHOT_MAX_AGE_MS = 30 * 60 * 1000;

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

export function catalogKey(filters: {
  search?: string | undefined;
  categoryId?: string | undefined;
  pageSize: number;
}): string {
  return `${PREFIX}${JSON.stringify([
    filters.search ?? "",
    filters.categoryId ?? "",
    filters.pageSize,
  ])}`;
}

export function readCatalogSnapshot(
  key: string,
  now = Date.now(),
): CatalogSnapshot | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(key) ?? "null");
    if (
      !value ||
      typeof value !== "object" ||
      !Array.isArray((value as CatalogSnapshot).products) ||
      typeof (value as CatalogSnapshot).lastPage !== "number" ||
      typeof (value as CatalogSnapshot).savedAt !== "number" ||
      now - (value as CatalogSnapshot).savedAt > CATALOG_SNAPSHOT_MAX_AGE_MS
    ) {
      return null;
    }
    return value as CatalogSnapshot;
  } catch {
    return null;
  }
}

export function writeCatalogSnapshot(
  key: string,
  snapshot: CatalogSnapshot,
): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // Storage full or blocked: Back simply starts from the first page again.
  }
}

export function clearCatalogSnapshot(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Nothing to clear when storage is unavailable.
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
