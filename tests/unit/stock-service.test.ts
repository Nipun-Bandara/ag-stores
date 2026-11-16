import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import type { AuthenticatedUser } from "@/types/auth";
import { getStockPage } from "@/services/stock.service";
import { getNavItemsForRole } from "@/lib/navigation";

const user = (role: AuthenticatedUser["role"]) =>
  ({ id: "owner", role }) as AuthenticatedUser;
function database() {
  return {
    product: {
      count: vi.fn().mockResolvedValue(25),
      findMany: vi.fn().mockResolvedValue([]),
    },
    category: { findMany: vi.fn().mockResolvedValue([]) },
  };
}

describe("stock pages", () => {
  it("limits owners to their own products and category options, including searched categories", async () => {
    const db = database();
    const result = await getStockPage(
      user("SHOP_OWNER"),
      { categoryId: "other-category", search: "rice" },
      { page: 100, pageSize: 12 },
      db as unknown as PrismaClient,
    );
    expect(db.category.findMany.mock.calls[0]![0].where).toEqual({
      shop: { ownerId: "owner" },
    });
    expect(db.product.count.mock.calls[0]![0].where).toMatchObject({
      shop: { ownerId: "owner" },
      categoryId: "other-category",
    });
    expect(db.product.findMany.mock.calls[0]![0]).toMatchObject({
      where: db.product.count.mock.calls[0]![0].where,
      skip: 24,
      take: 12,
    });
    expect(result.page).toBe(3);
  });

  it("lets admins read stock across shops and denies customers before database access", async () => {
    const db = database();
    await getStockPage(
      user("ADMIN"),
      {},
      { page: 1, pageSize: 24 },
      db as unknown as PrismaClient,
    );
    expect(db.product.count.mock.calls[0]![0].where).toEqual({});
    expect(db.category.findMany.mock.calls[0]![0].where).toEqual({});
    vi.clearAllMocks();
    await expect(
      getStockPage(
        user("CUSTOMER"),
        {},
        { page: 1, pageSize: 24 },
        db as unknown as PrismaClient,
      ),
    ).rejects.toThrow("Stock access requires");
    expect(db.product.count).not.toHaveBeenCalled();
    expect(db.category.findMany).not.toHaveBeenCalled();
  });

  it("compares stock with the purchasable minimum and respects kilogram precision", async () => {
    const db = database();
    db.product.findMany.mockResolvedValue([
      {
        sellingUnit: "UNIT",
        stockQuantity: "1",
        lowStockThreshold: "0",
        minimumOrderQuantity: "2",
        orderingIncrement: "1",
      },
      {
        sellingUnit: "KG",
        stockQuantity: "0.010",
        lowStockThreshold: "0.020",
        minimumOrderQuantity: "0.010",
        orderingIncrement: "1",
      },
      {
        sellingUnit: "UNIT",
        stockQuantity: "6",
        lowStockThreshold: "5",
        minimumOrderQuantity: "1",
        orderingIncrement: "1",
      },
    ]);
    const result = await getStockPage(
      user("ADMIN"),
      {},
      { page: 1, pageSize: 24 },
      db as unknown as PrismaClient,
    );
    expect(result.rows.map((row) => row.inventoryStatus)).toEqual([
      "OUT_OF_STOCK",
      "LOW_STOCK",
      "AVAILABLE",
    ]);
    expect(result.rows[1]!.stockQuantity).toBe(0.01);
  });

  it("exposes stocks navigation to each management role only", () => {
    expect(
      getNavItemsForRole("SHOP_OWNER").find((item) => item.label === "Stocks")
        ?.href,
    ).toBe("/owner/stocks");
    expect(
      getNavItemsForRole("ADMIN").find((item) => item.label === "Stocks")?.href,
    ).toBe("/admin/stocks");
    expect(
      getNavItemsForRole("CUSTOMER").some((item) => item.label === "Stocks"),
    ).toBe(false);
  });
});
