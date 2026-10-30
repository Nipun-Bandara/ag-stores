// @vitest-environment node

import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PrismaClient } from "@/generated/prisma/client";
import {
  getStorefrontCategory,
  getStorefrontProduct,
  listStorefrontCategories,
  listStorefrontProducts,
} from "@/services/storefront.service";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase("customer storefront queries", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        databaseUrl ?? "postgresql://unused:unused@127.0.0.1:1/unused",
    }),
  });
  let groceriesId: string;
  let inactiveCategoryId: string;
  let teaId: string;
  let zeroStockId: string;
  let unavailableId: string;
  let inactiveCategoryProductId: string;

  beforeAll(async () => {
    const groceries = await prisma.category.findFirstOrThrow({
      where: { nameEn: "Groceries" },
    });
    const inactiveCategory = await prisma.category.findFirstOrThrow({
      where: { nameEn: "Seasonal" },
    });
    const products = await prisma.product.findMany({
      where: {
        nameEn: {
          in: [
            "Ceylon Tea",
            "Coconut Milk",
            "Unavailable Sample",
            "Inactive Category Sample",
          ],
        },
      },
      select: { id: true, nameEn: true },
    });
    groceriesId = groceries.id;
    inactiveCategoryId = inactiveCategory.id;
    teaId = products.find(({ nameEn }) => nameEn === "Ceylon Tea")!.id;
    zeroStockId = products.find(({ nameEn }) => nameEn === "Coconut Milk")!.id;
    unavailableId = products.find(
      ({ nameEn }) => nameEn === "Unavailable Sample",
    )!.id;
    inactiveCategoryProductId = products.find(
      ({ nameEn }) => nameEn === "Inactive Category Sample",
    )!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("lists only active categories", async () => {
    const categories = await listStorefrontCategories();

    expect(categories.map(({ nameEn }) => nameEn)).toContain("Groceries");
    expect(categories.map(({ id }) => id)).not.toContain(inactiveCategoryId);
    await expect(getStorefrontCategory(inactiveCategoryId)).resolves.toBeNull();
  });

  it("lists available products from active categories only", async () => {
    const products = await listStorefrontProducts();
    const ids = products.map(({ id }) => id);

    expect(ids).toContain(teaId);
    expect(ids).toContain(zeroStockId);
    expect(ids).not.toContain(unavailableId);
    expect(ids).not.toContain(inactiveCategoryProductId);
  });

  it("marks a visible zero-stock product as out of stock", async () => {
    const product = await getStorefrontProduct(zeroStockId);

    expect(product).toMatchObject({
      nameEn: "Coconut Milk",
      stockQuantity: 0,
      isOutOfStock: true,
    });
  });

  it("searches available products", async () => {
    const products = await listStorefrontProducts({ search: "CEYLON BLACK" });

    expect(products.map(({ id }) => id)).toEqual([teaId]);
  });

  it("filters products by active category", async () => {
    const products = await listStorefrontProducts({ categoryId: groceriesId });

    expect(products.length).toBeGreaterThan(0);
    expect(products.every(({ categoryId }) => categoryId === groceriesId)).toBe(
      true,
    );
  });

  it("returns visible product details and hides excluded products", async () => {
    await expect(getStorefrontProduct(teaId)).resolves.toMatchObject({
      nameEn: "Ceylon Tea",
      price: "680.00",
    });
    await expect(getStorefrontProduct(unavailableId)).resolves.toBeNull();
    await expect(
      getStorefrontProduct(inactiveCategoryProductId),
    ).resolves.toBeNull();
  });
});
