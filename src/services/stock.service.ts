import { getDb } from "@/db";
import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import type { AuthenticatedUser } from "@/types/auth";
import { firstOrderQuantity } from "@/lib/quantity";
import {
  productPageInfo,
  type ProductPageRequest,
} from "@/lib/product-pagination";

export async function getStockPage(
  user: AuthenticatedUser,
  filters: { categoryId?: string; search?: string },
  request: ProductPageRequest,
  database?: PrismaClient,
) {
  if (user.role !== "ADMIN" && user.role !== "SHOP_OWNER") {
    throw new Error("Stock access requires an administrator or shop owner.");
  }
  const db = database ?? getDb();
  const scope =
    user.role === "SHOP_OWNER" ? { shop: { ownerId: user.id } } : {};
  const where: Prisma.ProductWhereInput = {
    ...scope,
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.search
      ? {
          OR: ["nameEn", "nameSi", "itemCode", "barcode"].map((field) => ({
            [field]: { contains: filters.search, mode: "insensitive" },
          })),
        }
      : {}),
  };
  const [total, categories] = await Promise.all([
    db.product.count({ where }),
    db.category.findMany({
      where: scope,
      select: {
        id: true,
        nameEn: true,
        nameSi: true,
        shop: { select: { name: true } },
      },
      orderBy: [{ nameEn: "asc" }, { shop: { name: "asc" } }, { id: "asc" }],
    }),
  ]);
  const pagination = productPageInfo(total, request);
  const rows = await db.product.findMany({
    where,
    select: {
      id: true,
      nameEn: true,
      nameSi: true,
      itemCode: true,
      sellingUnit: true,
      stockQuantity: true,
      lowStockThreshold: true,
      minimumOrderQuantity: true,
      orderingIncrement: true,
      isAvailable: true,
      shop: { select: { name: true } },
      category: { select: { nameEn: true, nameSi: true } },
    },
    orderBy: [{ nameEn: "asc" }, { shop: { name: "asc" } }, { id: "asc" }],
    skip: (pagination.page - 1) * pagination.pageSize,
    take: pagination.pageSize,
  });
  return {
    ...pagination,
    categories,
    rows: rows.map((row) => {
      const stock = Number(row.stockQuantity);
      const threshold = Number(row.lowStockThreshold);
      const minimum = firstOrderQuantity(row);
      return {
        ...row,
        stockQuantity: stock,
        lowStockThreshold: threshold,
        minimumOrderQuantity: Number(row.minimumOrderQuantity),
        orderingIncrement: Number(row.orderingIncrement),
        inventoryStatus:
          stock < minimum
            ? "OUT_OF_STOCK"
            : stock <= threshold
              ? "LOW_STOCK"
              : "AVAILABLE",
      };
    }),
  };
}
