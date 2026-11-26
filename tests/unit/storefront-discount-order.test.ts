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
  const filters = { categoryId: "category", page: 2, pageSize: 12 };
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

it("searches every word and close spellings, counting with the same conditions", async () => {
  const raw = vi
    .fn()
    .mockResolvedValueOnce([{ id: "b" }, { id: "a" }])
    .mockResolvedValueOnce([{ count: 2 }]);
  const findMany = vi.fn().mockResolvedValue([{ id: "a" }, { id: "b" }]);
  const repository = new PrismaStorefrontRepository({
    $queryRaw: raw,
    product: { findMany },
  } as unknown as PrismaClient);
  const filters = {
    categoryId: "category",
    search: "Basmati  ri%e",
    page: 1,
    pageSize: 12,
  };

  const result = await repository.findProducts(filters);
  expect(await repository.countProducts(filters)).toBe(2);
  expect(result.map((row) => row.id)).toEqual(["b", "a"]);

  const find = raw.mock.calls[0]![0] as Prisma.Sql;
  const total = raw.mock.calls[1]![0] as Prisma.Sql;
  // Each word separately, wildcards escaped, never the raw text in SQL.
  expect(find.values).toContain("%basmati%");
  expect(find.values).toContain("%ri\\%e%");
  expect(find.text).not.toContain("Basmati");
  expect(find.text).toContain("word_similarity(");
  expect(find.text).toContain('c."nameEn" ILIKE');
  expect(find.text).toContain('p."categoryId" =');
  expect(find.text).not.toContain("discount");
  // The count uses exactly the find's conditions.
  expect(total.values).toEqual(find.values.slice(0, total.values.length));
});

it("falls back to word matching when the database lacks pg_trgm", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const raw = vi
    .fn()
    .mockRejectedValueOnce(
      new Error(
        "function word_similarity(unknown, character varying) does not exist",
      ),
    )
    .mockResolvedValueOnce([]);
  const repository = new PrismaStorefrontRepository({
    $queryRaw: raw,
    product: { findMany: vi.fn() },
  } as unknown as PrismaClient);

  expect(await repository.findProducts({ search: "tea" })).toEqual([]);
  expect((raw.mock.calls[1]![0] as Prisma.Sql).text).not.toContain(
    "word_similarity",
  );
  warn.mockRestore();
});
