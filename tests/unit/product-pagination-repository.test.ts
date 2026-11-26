import { expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaStorefrontRepository } from "@/repositories/storefront.repository";
import { PrismaProductRepository } from "@/repositories/product.repository";
import { parseProductPage, productPageInfo } from "@/lib/product-pagination";
import { getStorefrontProductPage } from "@/services/storefront.service";

it("bounds requested pages and page sizes and clamps pages after filtering", () => {
  expect(parseProductPage({})).toEqual({ page: 1, pageSize: 24 });
  expect(parseProductPage({ page: "-2", pageSize: "8000" })).toEqual({
    page: 1,
    pageSize: 24,
  });
  expect(parseProductPage({ page: ["3"], pageSize: ["48"] })).toEqual({
    page: 3,
    pageSize: 48,
  });
  expect(productPageInfo(8000, { page: 1000, pageSize: 24 })).toMatchObject({
    page: 334,
    pageCount: 334,
  });
  expect(productPageInfo(0, { page: 9, pageSize: 24 })).toMatchObject({
    page: 1,
    pageCount: 1,
  });
});
it("fetches only a customer page and counts with identical visibility conditions", async () => {
  const findMany = vi.fn().mockResolvedValue([]);
  const count = vi.fn().mockResolvedValue(8000);
  const repository = new PrismaStorefrontRepository({
    product: { findMany, count },
  } as unknown as PrismaClient);
  const filters = { page: 3, pageSize: 24 };
  await repository.findProducts(filters);
  await repository.countProducts(filters);
  expect(findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      skip: 48,
      take: 24,
      orderBy: expect.arrayContaining([{ id: "asc" }]),
    }),
  );
  expect(findMany.mock.calls[0]![0].where).toEqual(
    count.mock.calls[0]![0].where,
  );
  expect(count.mock.calls[0]![0].where).toMatchObject({
    isAvailable: true,
    shop: { isActive: true },
    category: { status: "ACTIVE" },
  });
  await repository.findProducts({});
  expect(findMany.mock.lastCall![0].take).toBe(24);
});
it("clamps an out-of-range customer page before fetching its rows", async () => {
  const repository = {
    countProducts: vi.fn().mockResolvedValue(25),
    findProducts: vi.fn().mockResolvedValue([]),
    findCategories: vi.fn(),
    findCategoryById: vi.fn(),
    findProductById: vi.fn(),
  };
  const result = await getStorefrontProductPage(
    { search: "tea" },
    { page: 900, pageSize: 24 },
    repository,
  );
  expect(repository.findProducts).toHaveBeenCalledWith({
    search: "tea",
    page: 2,
    pageSize: 24,
    limit: 24,
  });
  expect(result).toMatchObject({
    page: 2,
    pageCount: 2,
    total: 25,
    pageSize: 24,
  });
});
it("keeps owner scope and bounded reads when inventory filtering is absent", async () => {
  const findMany = vi.fn().mockResolvedValue([]);
  const count = vi.fn().mockResolvedValue(8000);
  const repository = new PrismaProductRepository({
    product: { findMany, count },
  } as unknown as PrismaClient);
  const filters = {
    page: 2,
    pageSize: 12,
    categoryId: "category",
    search: "000123",
  };
  await repository.findManyOwned("owner", filters);
  await repository.countOwned("owner", filters);
  expect(findMany.mock.calls[0]![0]).toMatchObject({
    skip: 12,
    take: 12,
    where: { shop: { ownerId: "owner" }, categoryId: "category" },
  });
  expect(count.mock.calls[0]![0].where).toEqual(
    findMany.mock.calls[0]![0].where,
  );
});
it.each(["LOW_STOCK", "OUT_OF_STOCK", "AVAILABLE"] as const)(
  "filters %s in SQL before LIMIT and returns records in the saved page order",
  async (inventoryStatus) => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: "b" }, { id: "a" }])
      .mockResolvedValueOnce([{ total: BigInt(8000) }]);
    const findMany = vi.fn().mockResolvedValue([{ id: "a" }, { id: "b" }]);
    const repository = new PrismaProductRepository({
      $queryRaw: query,
      product: { findMany },
    } as unknown as PrismaClient);
    const filters = {
      inventoryStatus,
      categoryId: "category",
      search: "tea%",
      page: 2,
      pageSize: 24,
    };
    const products = await repository.findManyOwned("owner", filters);
    expect(products.map((p) => p.id)).toEqual(["b", "a"]);
    expect(await repository.countOwned("owner", filters)).toBe(8000);
    const sql = query.mock.calls[0]![0];
    expect(sql.text).toContain('s."ownerId" =');
    expect(sql.text).toContain('p."categoryId" =');
    expect(sql.text).toContain("CEIL(");
    expect(sql.text).toContain("GREATEST(");
    expect(sql.text).toContain("LIMIT");
    expect(sql.text).not.toContain("tea%");
    expect(sql.values.slice(-2)).toEqual([24, 24]);
    expect(query.mock.calls[1]![0].values).toEqual(sql.values.slice(0, -2));
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["b", "a"] }, shop: { ownerId: "owner" } },
      }),
    );
  },
);
