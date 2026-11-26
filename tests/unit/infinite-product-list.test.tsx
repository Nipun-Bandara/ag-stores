import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import {
  appendUnique,
  saveCatalogScroll,
  urlWithLoadedPages,
} from "@/features/storefront/catalog-session";
import { InfiniteProductList } from "@/features/storefront/components/infinite-product-list";
import { parseLoadedPages } from "@/lib/product-pagination";
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
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

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
  window.history.replaceState(null, "", "/products?search=tea");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("appends pages on demand, records them in the URL and stops at the end", async () => {
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
  expect(window.location.search).toBe("?search=tea&loaded=2");

  fireEvent.click(await screen.findByRole("button", { name: "Load more" }));
  expect(await screen.findByText("Product e")).toBeVisible();
  expect(screen.getAllByText("Product d")).toHaveLength(1);
  expect(window.location.search).toBe("?search=tea&loaded=3");
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

it("shows server-restored pages and returns to the saved scroll on Back", async () => {
  window.history.replaceState(null, "", "/products?search=tea&loaded=2");
  saveCatalogScroll("/products?search=tea&loaded=2", 1234);
  const scrollTo = vi.fn();
  vi.stubGlobal("scrollTo", scrollTo);
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => {
    callback();
    return 0;
  });
  window.dispatchEvent(new PopStateEvent("popstate"));

  render(
    list({ initialLastPage: 2, initialProducts: [product("c"), product("d")] }),
  );

  expect(screen.getByText("Product d")).toBeVisible();
  await waitFor(() => expect(scrollTo).toHaveBeenCalledWith({ top: 1234 }));
  expect(fetchMock).not.toHaveBeenCalled();
  // The next page continues after the restored ones.
  fetchMock.mockResolvedValueOnce(pageResponse(["e"], 3, 3));
  fireEvent.click(screen.getByRole("button", { name: "Load more" }));
  expect(await screen.findByText("Product e")).toBeVisible();
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/storefront/products?page=3&pageSize=2&search=tea",
  );
});

it("fetches pages the URL lists but a cached render lacks, then restores scroll", async () => {
  // Back can reuse the router's render from before `loaded` was written.
  window.history.replaceState(null, "", "/products?search=tea&loaded=3");
  saveCatalogScroll("/products?search=tea&loaded=3", 900);
  const scrollTo = vi.fn();
  vi.stubGlobal("scrollTo", scrollTo);
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => {
    callback();
    return 0;
  });
  window.dispatchEvent(new PopStateEvent("popstate"));
  fetchMock.mockImplementation(async (url: string) =>
    url.includes("page=2")
      ? pageResponse(["c", "d"], 2, 3)
      : pageResponse(["e"], 3, 3),
  );

  render(list());

  expect(await screen.findByText("Product e")).toBeVisible();
  expect(screen.getByText("Product c")).toBeVisible();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await waitFor(() => expect(scrollTo).toHaveBeenCalledWith({ top: 900 }));
  expect(screen.getByText("You've reached the end of the list.")).toBeVisible();
});

it("leaves a deep-linked numbered page out of the URL count", async () => {
  window.history.replaceState(null, "", "/products?page=2");
  fetchMock.mockResolvedValueOnce(pageResponse(["e"], 3, 3));
  render(list({ initialPage: 2 }));
  fireEvent.click(await screen.findByRole("button", { name: "Load more" }));
  await screen.findByText("Product e");
  expect(window.location.search).toBe("?page=2");
});

it("renders nothing when everything fits on the first page", () => {
  const { container } = render(list({ pageCount: 1 }));
  expect(container).toBeEmptyDOMElement();
});

it("parses the loaded count safely and builds URLs", () => {
  expect(parseLoadedPages("3", 1, 5)).toBe(3);
  expect(parseLoadedPages("9", 1, 5)).toBe(5);
  expect(parseLoadedPages("500", 1, 999)).toBe(20);
  expect(parseLoadedPages("3", 2, 5)).toBe(1);
  expect(parseLoadedPages("x", 1, 5)).toBe(1);
  expect(urlWithLoadedPages("http://h/products?search=t", 2)).toBe(
    "/products?search=t&loaded=2",
  );
  expect(urlWithLoadedPages("http://h/products?loaded=2", 1)).toBe("/products");
  expect(
    appendUnique(
      [product("a")],
      [product("a"), product("b")],
      new Set(["b"]),
    ).map((item) => item.id),
  ).toEqual(["a"]);
});
