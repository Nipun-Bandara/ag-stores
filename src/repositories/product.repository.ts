import { validatePricing, tierViews } from "@/lib/pricing";
import { SellingSetupError, firstOrderQuantity } from "@/lib/quantity";
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
  itemCode: true,
  barcode: true,
  id: true,
  shopId: true,
  categoryId: true,
  nameEn: true,
  nameSi: true,
  descriptionEn: true,
  descriptionSi: true,
  price: true,
  discountTiers: {
    orderBy: { position: "asc" as const },
    select: { minimumQuantity: true, discountAmount: true },
  },
  sellingUnit: true,
  minimumOrderQuantity: true,
  orderingIncrement: true,
  stockQuantity: true,
  lowStockThreshold: true,
  imageUrl: true,
  isAvailable: true,
  createdAt: true,
  updatedAt: true,
  shop: { select: { name: true } },
  category: { select: { nameEn: true, nameSi: true, status: true } },
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
  nameSi: string | null;
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
  create(input: ProductCreateInput, actorId: string): Promise<ProductRecord>;
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
      select: {
        id: true,
        shopId: true,
        nameEn: true,
        nameSi: true,
        status: true,
      },
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

  async findManyOwned(
    ownerId: string,
    filters: ProductFilters,
  ): Promise<ProductRecord[]> {
    const search = filters.search;
    const products = await this.prisma.product.findMany({
      where: {
        shop: { ownerId },
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(search
          ? {
              OR: [
                { itemCode: { contains: search, mode: "insensitive" } },
                { barcode: { contains: search, mode: "insensitive" } },
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
    // The first purchasable quantity may be above an unaligned minimum.
    return products.filter((product) => {
      const status =
        Number(product.stockQuantity) < firstOrderQuantity(product)
          ? "OUT_OF_STOCK"
          : product.stockQuantity.lte(product.lowStockThreshold)
            ? "LOW_STOCK"
            : "AVAILABLE";
      return !filters.inventoryStatus || status === filters.inventoryStatus;
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

  create(input: ProductCreateInput, actorId: string): Promise<ProductRecord> {
    const { discountTiers = [], ...fields } = input;
    validatePricing(input.price, discountTiers, input);
    return this.prisma.$transaction(async (transaction) => {
      const product = await transaction.product.create({
        data: {
          ...fields,
          discountTiers: {
            create: discountTiers.map((tier, index) => ({
              ...tier,
              position: index + 1,
            })),
          },
        },
        select: productSelect,
      });
      await writeAuditLog(transaction, {
        actorId,
        action: AuditAction.PRODUCT_PRICE_UPDATED,
        entityType: AuditEntityType.PRODUCT,
        entityId: product.id,
        metadata: {
          previousPrice: null,
          newPrice: product.price.toFixed(2),
          previousTiers: [],
          newTiers: discountTiers,
          sellingUnit: product.sellingUnit,
        },
      });
      return product;
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
            where: { id: productId, shop: { ownerId: actorId } },
            select: {
              price: true,
              stockQuantity: true,
              sellingUnit: true,
              lowStockThreshold: true,
              discountTiers: {
                orderBy: { position: "asc" },
                select: { minimumQuantity: true, discountAmount: true },
              },
            },
          });
          if (
            input.sellingUnit === "UNIT" &&
            !Number.isInteger(
              input.lowStockThreshold ?? Number(previous.lowStockThreshold),
            )
          )
            throw new SellingSetupError(
              "UNIT quantities must be whole numbers.",
            );
          if (previous.sellingUnit !== input.sellingUnit) {
            const active = await transaction.orderItem.count({
              where: {
                productId,
                order: {
                  status: {
                    notIn: [
                      "DELIVERED",
                      "CANCELLED",
                      "REJECTED",
                      "FAILED_DELIVERY",
                    ],
                  },
                },
              },
            });
            if (
              !previous.stockQuantity.isZero() ||
              input.stockQuantity !== 0 ||
              active > 0
            ) {
              throw new SellingSetupError(
                "Selling unit can only change with zero stock and no active orders.",
              );
            }
          }
          const previousTiers = tierViews(previous.discountTiers);
          const nextTiers = input.discountTiers ?? previousTiers;
          validatePricing(input.price, nextTiers, input);
          const product = await transaction.product.update({
            where: { id: productId },
            data: {
              itemCode: input.itemCode,
              barcode: input.barcode,
              sellingUnit: input.sellingUnit,
              minimumOrderQuantity: input.minimumOrderQuantity,
              orderingIncrement: input.orderingIncrement,
              categoryId: input.categoryId,
              nameEn: input.nameEn,
              nameSi: input.nameSi,
              descriptionEn: input.descriptionEn,
              descriptionSi: input.descriptionSi,
              price: input.price,
              ...(input.discountTiers === undefined
                ? {}
                : {
                    discountTiers: {
                      deleteMany: {},
                      create: nextTiers.map((tier, index) => ({
                        ...tier,
                        position: index + 1,
                      })),
                    },
                  }),
              stockQuantity: input.stockQuantity,
              imageUrl: input.imageUrl,
              isAvailable: input.isAvailable,
              ...(input.lowStockThreshold === undefined
                ? {}
                : { lowStockThreshold: input.lowStockThreshold }),
            },
            select: productSelect,
          });
          if (
            !previous.price.equals(product.price) ||
            JSON.stringify(previousTiers) !== JSON.stringify(nextTiers) ||
            previous.sellingUnit !== product.sellingUnit
          ) {
            await writeAuditLog(transaction, {
              actorId,
              action: AuditAction.PRODUCT_PRICE_UPDATED,
              entityType: AuditEntityType.PRODUCT,
              entityId: product.id,
              metadata: {
                previousPrice: previous.price.toFixed(2),
                newPrice: product.price.toFixed(2),
                previousTiers,
                newTiers: nextTiers,
                previousSellingUnit: previous.sellingUnit,
                sellingUnit: product.sellingUnit,
              },
            });
          }
          if (!previous.stockQuantity.equals(product.stockQuantity)) {
            await writeAuditLog(transaction, {
              actorId,
              action: AuditAction.PRODUCT_STOCK_UPDATED,
              entityType: AuditEntityType.PRODUCT,
              entityId: product.id,
              metadata: {
                previousQuantity: previous.stockQuantity.toString(),
                newQuantity: product.stockQuantity.toString(),
                sellingUnit: product.sellingUnit,
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
            select: { id: true, stockQuantity: true, sellingUnit: true },
          });
          if (!product) return null;
          await transaction.$queryRaw`
            SELECT "id"
            FROM "products"
            WHERE "id" = ${product.id}::uuid
            FOR UPDATE
          `;
          if (
            product.sellingUnit === "UNIT" &&
            (!Number.isInteger(input.stockQuantity) ||
              (input.lowStockThreshold !== undefined &&
                !Number.isInteger(input.lowStockThreshold)))
          ) {
            throw new SellingSetupError(
              "UNIT quantities must be whole numbers.",
            );
          }
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
          if (!product.stockQuantity.equals(updated.stockQuantity)) {
            await writeAuditLog(transaction, {
              actorId,
              action: AuditAction.PRODUCT_STOCK_UPDATED,
              entityType: AuditEntityType.PRODUCT,
              entityId: updated.id,
              metadata: {
                previousQuantity: product.stockQuantity.toString(),
                newQuantity: updated.stockQuantity.toString(),
                sellingUnit: updated.sellingUnit,
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
