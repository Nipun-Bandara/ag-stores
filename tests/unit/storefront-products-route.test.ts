// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";

import { GET } from "@/app/api/storefront/products/route";

const mocks = vi.hoisted(() => ({ page: vi.fn() }));
vi.mock("@/services/storefront.service", () => ({
  getStorefrontProductPage: mocks.page,
}));

const categoryId = "7f1d8a37-6a1b-4c8f-9f7e-1b2c3d4e5f60";

beforeEach(() => {
  mocks.page.mockReset();
  mocks.page.mockResolvedValue({
    products: [],
    page: 2,
    pageSize: 12,
    total: 30,
    pageCount: 3,
  });
});

it("returns a public catalogue page using the storefront filters", async () => {
  const response = await GET(
    new NextRequest(
      `http://localhost/api/storefront/products?page=2&pageSize=12&search=tea&categoryId=${categoryId}`,
    ),
  );
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({
    data: { page: 2, pageCount: 3 },
  });
  expect(mocks.page).toHaveBeenCalledWith(
    { search: "tea", categoryId },
    { page: 2, pageSize: 12 },
  );
});

it("falls back to safe paging defaults and ignores an empty search", async () => {
  await GET(
    new NextRequest(
      "http://localhost/api/storefront/products?page=abc&pageSize=1000&search=",
    ),
  );
  expect(mocks.page).toHaveBeenCalledWith({}, { page: 1, pageSize: 24 });
});

it("rejects malformed filters without querying", async () => {
  const response = await GET(
    new NextRequest(
      "http://localhost/api/storefront/products?categoryId=not-a-uuid",
    ),
  );
  expect(response.status).toBe(400);
  expect(mocks.page).not.toHaveBeenCalled();
});
