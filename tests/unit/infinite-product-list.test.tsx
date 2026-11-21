import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import {
  appendUnique,
  catalogKey,
  CATALOG_SNAPSHOT_MAX_AGE_MS,
  readCatalogSnapshot,
  writeCatalogSnapshot,
} from "@/features/storefront/catalog-session";
import { InfiniteProductList } from "@/features/storefront/components/infinite-product-list";
import type { StorefrontProductView } from "@/services/storefront.service";

function product(id: string): StorefrontProductView {
  return {
    id,
    shopId: "shop",
    shopName: "Shop",
    categoryId: "category",
    categoryNameEn: "Groceries",
    categoryNameSi: null,
    nameEn: `Product ${id}`,
    nameSi: null,
    descriptionEn: null,
    descriptionSi: null,
    price: "100.00",
    discountTiers: [],
    sellingUnit: "UNIT",
    minimumOrderQuantity: 1,
    orderingIncrement: 1,
    stockQuantity: 5,
    imageUrl: null,
    isOutOfStock: false,
  };
}

function pageResponse(ids: string[], page: number, pageCount: number) {
  return {
    ok: true,
    json: async () => ({
      data: { products: ids.map(product), page, pageCount },
    }),
  };
}

const fetchMock = vi.fn();

function list(props: Partial<Parameters<typeof InfiniteProductList>[0]> = {}) {
  return (
    <InfiniteProductList
      initialPage={1}
      pageCount={3}
      pageSize={2}
      initialProductIds={["a", "b"]}
      search="tea"
      locale="en"
      localizedRoute={false}
      {...props}
    />
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("appends the next pages on demand and stops at the end", async () => {
  fetchMock
    .mockResolvedValueOnce(pageResponse(["c", "d"], 2, 3))
    // A shifted offset can repeat a product; it must not appear twice.
    .mockResolvedValueOnce(pageResponse(["d", "e"], 3, 3));
  render(list());

  fireEvent.click(await screen.findByRole("button", { name: "Load more" }));
  expect(await screen.findByText("Product c")).toBeVisible();
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/storefront/products?page=2&pageSize=2&search=tea",
  );

  fireEvent.click(await screen.findByRole("button", { name: "Load more" }));
  expect(await screen.findByText("Product e")).toBeVisible();
  expect(screen.getAllByText("Product d")).toHaveLength(1);
  expect(screen.getByText("You've reached the end of the list.")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
});

it("offers a retry when a page fails to load", async () => {
  fetchMock
    .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
    .mockResolvedValueOnce(pageResponse(["c"], 2, 2));
  render(list({ pageCount: 2 }));

  fireEvent.click(await screen.findByRole("button", { name: "Load more" }));
  fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
  expect(await screen.findByText("Product c")).toBeVisible();
});

it("restores loaded pages and scroll position when returning with Back", async () => {
  const key = catalogKey({ search: "tea", pageSize: 2 });
  writeCatalogSnapshot(key, {
    products: [product("c"), product("d")],
    lastPage: 2,
    scrollY: 1234,
    savedAt: Date.now(),
  });
  const scrollTo = vi.fn();
  vi.stubGlobal("scrollTo", scrollTo);
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => {
    callback();
    return 0;
  });

  act(() => {
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  render(list());

  expect(await screen.findByText("Product d")).toBeVisible();
  await waitFor(() => expect(scrollTo).toHaveBeenCalledWith({ top: 1234 }));
  expect(fetchMock).not.toHaveBeenCalled();
});

it("starts fresh when the page is opened from a link", async () => {
  const key = catalogKey({ search: "tea", pageSize: 2 });
  writeCatalogSnapshot(key, {
    products: [product("c")],
    lastPage: 2,
    scrollY: 10,
    savedAt: Date.now() - 10_000,
  });
  // Far enough after any earlier popstate in this test file.
  vi.setSystemTime(Date.now() + 60_000);
  render(list());
  await screen.findByRole("button", { name: "Load more" });
  expect(screen.queryByText("Product c")).toBeNull();
  expect(sessionStorage.getItem(key)).toBeNull();
  vi.useRealTimers();
});

it("renders nothing when everything fits on the first page", () => {
  const { container } = render(list({ pageCount: 1 }));
  expect(container).toBeEmptyDOMElement();
});

it("ignores stale snapshots and de-duplicates appended products", () => {
  const key = catalogKey({ categoryId: "x", pageSize: 24 });
  writeCatalogSnapshot(key, {
    products: [product("a")],
    lastPage: 2,
    scrollY: 0,
    savedAt: 0,
  });
  expect(readCatalogSnapshot(key, CATALOG_SNAPSHOT_MAX_AGE_MS + 1)).toBeNull();
  expect(readCatalogSnapshot(key, 1)).not.toBeNull();
  expect(
    appendUnique(
      [product("a")],
      [product("a"), product("b")],
      new Set(["b"]),
    ).map((item) => item.id),
  ).toEqual(["a"]);
});
