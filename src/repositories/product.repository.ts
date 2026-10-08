import {
  AuditAction,
  AuditEntityType,
  Prisma,
  type PrismaClient,
} from "@/generated/prisma/client";
import { withSerializableRetry } from "@/lib/db-transaction";
import { writeAuditLog } from "@/repositories/audit-write.repository";
import type {
  ProductAvailabilityInput,
  ProductCreateInput,
  ProductInventoryStatus,
  ProductStockInput,
  ProductUpdateInput,
} from "@/validations/product";

const productSelect = {
  id: true,
  shopId: true,
  categoryId: true,
  nameEn: true,
  nameSi: true,
  descriptionEn: true,
  descriptionSi: true,
  price: true,
  stockQuantity: true,
  lowStockThreshold: true,
  imageUrl: true,
  isAvailable: true,
  createdAt: true,
  updatedAt: true,
  shop: { select: { name: true } },
  category: { select: { nameEn: true, status: true } },
} satisfies Prisma.ProductSelect;

export type ProductRecord = Prisma.ProductGetPayload<{
  select: typeof productSelect;
}>;

export interface ProductShopRecord {
  id: string;
  name: string;
}

export interface ProductCategoryRecord {
  id: string;
  shopId: string;
  nameEn: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface ProductFilters {
  categoryId?: string;
  search?: string;
  inventoryStatus?: ProductInventoryStatus;
}

export interface ProductRepository {
  findOwnerShops(ownerId: string): Promise<ProductShopRecord[]>;
  findOwnerCategories(ownerId: string): Promise<ProductCategoryRecord[]>;
  ownerHasCategory(
    ownerId: string,
    shopId: string,
    categoryId: string,
  ): Promise<boolean>;
  findManyOwned(
    ownerId: string,
    filters: ProductFilters,
  ): Promise<ProductRecord[]>;
  findOwnedById(
    ownerId: string,
    productId: string,
  ): Promise<ProductRecord | null>;
  create(input: ProductCreateInput): Promise<ProductRecord>;
  update(
    actorId: string,
    productId: string,
    input: ProductUpdateInput,
  ): Promise<ProductRecord>;
  setAvailabilityOwned(
    ownerId: string,
    productId: string,
    input: ProductAvailabilityInput,
  ): Promise<ProductRecord | null>;
  updateStockOwned(
    actorId: string,
    ownerId: string,
    productId: string,
    input: ProductStockInput,
  ): Promise<ProductRecord | null>;
}

export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findOwnerShops(ownerId: string): Promise<ProductShopRecord[]> {
    return this.prisma.shop.findMany({
      where: { ownerId },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true },
    });
  }

  findOwnerCategories(ownerId: string): Promise<ProductCategoryRecord[]> {
    return this.prisma.category.findMany({
      where: { shop: { ownerId } },
      orderBy: [{ shop: { name: "asc" } }, { nameEn: "asc" }],
      select: { id: true, shopId: true, nameEn: true, status: true },
    });
  }

  async ownerHasCategory(
    ownerId: string,
    shopId: string,
    categoryId: string,
  ): Promise<boolean> {
    return (
      (await this.prisma.category.count({
        where: { id: categoryId, shopId, shop: { ownerId } },
      })) === 1
    );
  }

  findManyOwned(
    ownerId: string,
    filters: ProductFilters,
  ): Promise<ProductRecord[]> {
    const search = filters.search;
    const inventoryFilter = (() => {
      switch (filters.inventoryStatus) {
        case "OUT_OF_STOCK":
          return { stockQuantity: 0 };
        case "LOW_STOCK":
          return {
            stockQuantity: {
              gt: 0,
              lte: this.prisma.product.fields.lowStockThreshold,
            },
          };
        case "AVAILABLE":
          return {
            stockQuantity: {
              gt: this.prisma.product.fields.lowStockThreshold,
            },
          };
        default:
          return {};
      }
    })();
    return this.prisma.product.findMany({
      where: {
        shop: { ownerId },
        ...inventoryFilter,
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(search
          ? {
              OR: [
                { nameEn: { contains: search, mode: "insensitive" } },
                { nameSi: { contains: search, mode: "insensitive" } },
                { descriptionEn: { contains: search, mode: "insensitive" } },
                { descriptionSi: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ shop: { name: "asc" } }, { nameEn: "asc" }],
      select: productSelect,
    });
  }

  findOwnedById(
    ownerId: string,
    productId: string,
  ): Promise<ProductRecord | null> {
    return this.prisma.product.findFirst({
      where: { id: productId, shop: { ownerId } },
      select: productSelect,
    });
  }

  create(input: ProductCreateInput): Promise<ProductRecord> {
    return this.prisma.product.create({
      data: input,
      select: productSelect,
    });
  }

  async update(
    actorId: string,
    productId: string,
    input: ProductUpdateInput,
  ): Promise<ProductRecord> {
    return withSerializableRetry(() =>
      this.prisma.$transaction(
        async (transaction) => {
          await transaction.$queryRaw`
            SELECT "id"
            FROM "products"
            WHERE "id" = ${productId}::uuid
            FOR UPDATE
          `;
          const previous = await transaction.product.findUniqueOrThrow({
            where: { id: productId },
            select: { price: true, stockQuantity: true },
          });
          const product = await transaction.product.update({
            where: { id: productId },
            data: {
              categoryId: input.categoryId,
              nameEn: input.nameEn,
              nameSi: input.nameSi,
              descriptionEn: input.descriptionEn,
              descriptionSi: input.descriptionSi,
              price: input.price,
              stockQuantity: input.stockQuantity,
              imageUrl: input.imageUrl,
              isAvailable: input.isAvailable,
              ...(input.lowStockThreshold === undefined
                ? {}
                : { lowStockThreshold: input.lowStockThreshold }),
            },
            select: productSelect,
          });
          if (!previous.price.equals(product.price)) {
            await writeAuditLog(transaction, {
              actorId,
              action: AuditAction.PRODUCT_PRICE_UPDATED,
              entityType: AuditEntityType.PRODUCT,
              entityId: product.id,
              metadata: {
                previousPrice: previous.price.toFixed(2),
                newPrice: product.price.toFixed(2),
              },
            });
          }
          if (previous.stockQuantity !== product.stockQuantity) {
            await writeAuditLog(transaction, {
              actorId,
              action: AuditAction.PRODUCT_STOCK_UPDATED,
              entityType: AuditEntityType.PRODUCT,
              entityId: product.id,
              metadata: {
                previousQuantity: previous.stockQuantity,
                newQuantity: product.stockQuantity,
              },
            });
          }
          return product;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }

  setAvailabilityOwned(
    ownerId: string,
    productId: string,
    input: ProductAvailabilityInput,
  ): Promise<ProductRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const product = await transaction.product.findFirst({
        where: { id: productId, shop: { ownerId } },
        select: { id: true },
      });
      if (!product) return null;
      return transaction.product.update({
        where: { id: productId },
        data: input,
        select: productSelect,
      });
    });
  }

  updateStockOwned(
    actorId: string,
    ownerId: string,
    productId: string,
    input: ProductStockInput,
  ): Promise<ProductRecord | null> {
    return withSerializableRetry(() =>
      this.prisma.$transaction(
        async (transaction) => {
          const product = await transaction.product.findFirst({
            where: { id: productId, shop: { ownerId } },
            select: { id: true, stockQuantity: true },
          });
          if (!product) return null;
          await transaction.$queryRaw`
            SELECT "id"
            FROM "products"
            WHERE "id" = ${product.id}::uuid
            FOR UPDATE
          `;
          const updated = await transaction.product.update({
            where: { id: productId },
            data: {
              stockQuantity: input.stockQuantity,
              ...(input.lowStockThreshold === undefined
                ? {}
                : { lowStockThreshold: input.lowStockThreshold }),
            },
            select: productSelect,
          });
          if (product.stockQuantity !== updated.stockQuantity) {
            await writeAuditLog(transaction, {
              actorId,
              action: AuditAction.PRODUCT_STOCK_UPDATED,
              entityType: AuditEntityType.PRODUCT,
              entityId: updated.id,
              metadata: {
                previousQuantity: product.stockQuantity,
                newQuantity: updated.stockQuantity,
              },
            });
          }
          return updated;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }
}
