import { expect, it, vi } from "vitest";
import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import { PrismaStorefrontRepository } from "@/repositories/storefront.repository";

it("ranks category discounts across the entire category before pagination and preserves that order", async () => {
  const raw = vi.fn().mockResolvedValue([{ id: "largest" }, { id: "smaller" }]);
  const findMany = vi
    .fn()
    .mockResolvedValue([{ id: "smaller" }, { id: "largest" }]);
  const count = vi.fn().mockResolvedValue(100);
  const repository = new PrismaStorefrontRepository({
    $queryRaw: raw,
    product: { findMany, count },
  } as unknown as PrismaClient);
  const filters = {
    categoryId: "category",
    search: "tea%_",
    page: 2,
    pageSize: 12,
  };
  const result = await repository.findProducts(filters);
  await repository.countProducts(filters);
  const sql = raw.mock.calls[0]![0] as Prisma.Sql;
  expect(sql.text).toContain('discount."discountAmount" / NULLIF(p.price, 0)');
  expect(sql.text.indexOf("ORDER BY COALESCE")).toBeLessThan(
    sql.text.lastIndexOf("LIMIT"),
  );
  expect(sql.text).toContain('t."minimumQuantity" <= CASE');
  expect(sql.text).toContain('CEIL(p."minimumOrderQuantity"');
  expect(sql.text).toContain('GREATEST(p."minimumOrderQuantity", 0.002)');
  expect(sql.text).toContain('s."isActive" = TRUE');
  expect(sql.text).toContain("c.status = 'ACTIVE'");
  expect(sql.text).not.toContain("tea%_");
  expect(sql.values).toContain("%tea\\%\\_%");
  expect(sql.values.slice(-2)).toEqual([12, 12]);
  expect(result.map((row) => row.id)).toEqual(["largest", "smaller"]);
  expect(findMany.mock.calls[0]![0].where).toMatchObject({
    categoryId: "category",
    isAvailable: true,
    shop: { isActive: true },
    category: { status: "ACTIVE" },
    id: { in: ["largest", "smaller"] },
  });
  expect(count.mock.calls[0]![0].where).toMatchObject({
    categoryId: "category",
    isAvailable: true,
  });
});

it("does not hydrate or read an unbounded list when a category page is empty", async () => {
  const findMany = vi.fn();
  const repository = new PrismaStorefrontRepository({
    $queryRaw: vi.fn().mockResolvedValue([]),
    product: { findMany },
  } as unknown as PrismaClient);
  expect(await repository.findProducts({ categoryId: "category" })).toEqual([]);
  expect(findMany).not.toHaveBeenCalled();
});
