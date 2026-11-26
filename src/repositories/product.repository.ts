import { DEFAULT_PRODUCT_PAGE_SIZE } from "@/lib/product-pagination";
import { validatePricing, tierViews } from "@/lib/pricing";
import { SellingSetupError } from "@/lib/quantity";
import {
  AuditAction,
  AuditEntityType,
  Prisma,
  type PrismaClient,
} from "@/generated/prisma/client";
import { withSerializableRetry } from "@/lib/db-transaction";
import { writeAuditLog } from "@/repositories/audit-write.repository";
import { publicPhotoUrl } from "@/lib/product-photo-storage";
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
  imageStorageKey: true,
  isAvailable: true,
  createdAt: true,
  updatedAt: true,
  shop: { select: { name: true } },
  category: { select: { nameEn: true, nameSi: true, status: true } },
} satisfies Prisma.ProductSelect;

// A photo attachment and audit write add round trips to product saves. The
// database can be slower than Prisma's five-second interactive default.
const productWriteTransaction = { timeout: 20_000 } as const;

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
  page?: number;
  pageSize?: number;
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
  countOwned(ownerId: string, filters: ProductFilters): Promise<number>;
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

function ownerProductWhere(
  ownerId: string,
  filters: ProductFilters,
): Prisma.ProductWhereInput {
  const search = filters.search;
  return {
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
  };
}

function ownerInventoryWhere(
  ownerId: string,
  filters: ProductFilters,
): Prisma.Sql {
  const minimum = Prisma.sql`CASE WHEN p."sellingUnit" = 'KG' THEN GREATEST(p."minimumOrderQuantity", 0.002) ELSE CEIL(p."minimumOrderQuantity" / NULLIF(p."orderingIncrement", 0)) * p."orderingIncrement" END`;
  const available = Prisma.sql`p."stockQuantity" >= (${minimum})`;
  const inventory =
    filters.inventoryStatus === "OUT_OF_STOCK"
      ? Prisma.sql`p."stockQuantity" < (${minimum})`
      : filters.inventoryStatus === "LOW_STOCK"
        ? Prisma.sql`${available} AND p."stockQuantity" <= p."lowStockThreshold"`
        : Prisma.sql`${available} AND p."stockQuantity" > p."lowStockThreshold"`;
  const search = filters.search
    ? `%${filters.search.replace(/[\\%_]/g, "\\$&")}%`
    : undefined;
  return Prisma.sql`s."ownerId" = ${ownerId}::uuid
    ${filters.categoryId ? Prisma.sql`AND p."categoryId" = ${filters.categoryId}::uuid` : Prisma.empty}
    ${search ? Prisma.sql`AND (p."itemCode" ILIKE ${search} OR p.barcode ILIKE ${search} OR p."nameEn" ILIKE ${search} OR p."nameSi" ILIKE ${search} OR p."descriptionEn" ILIKE ${search} OR p."descriptionSi" ILIKE ${search})` : Prisma.empty}
    AND (${inventory})`;
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
    const take = Math.min(filters.pageSize ?? DEFAULT_PRODUCT_PAGE_SIZE, 48);
    const skip = ((filters.page ?? 1) - 1) * take;
    if (filters.inventoryStatus) {
      const ids = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT p.id FROM products p JOIN shops s ON s.id = p."shopId"
        WHERE ${ownerInventoryWhere(ownerId, filters)}
        ORDER BY s.name ASC, p."nameEn" ASC, p.id ASC LIMIT ${take} OFFSET ${skip}
      `);
      if (!ids.length) return [];
      const products = await this.prisma.product.findMany({
        where: { id: { in: ids.map((item) => item.id) }, shop: { ownerId } },
        select: productSelect,
      });
      const byId = new Map(products.map((product) => [product.id, product]));
      return ids.flatMap((item) => {
        const product = byId.get(item.id);
        return product ? [product] : [];
      });
    }
    return this.prisma.product.findMany({
      where: ownerProductWhere(ownerId, filters),
      orderBy: [{ shop: { name: "asc" } }, { nameEn: "asc" }, { id: "asc" }],
      skip,
      take,
      select: productSelect,
    });
  }

  async countOwned(ownerId: string, filters: ProductFilters): Promise<number> {
    if (!filters.inventoryStatus)
      return this.prisma.product.count({
        where: ownerProductWhere(ownerId, filters),
      });
    const result = await this.prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`
      SELECT COUNT(*) AS total FROM products p JOIN shops s ON s.id = p."shopId"
      WHERE ${ownerInventoryWhere(ownerId, filters)}
    `);
    return Number(result[0]?.total ?? 0);
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
    const { discountTiers = [], imageUploadId, ...fields } = input;
    validatePricing(input.price, discountTiers, input);
    return this.prisma.$transaction(async (transaction) => {
      const upload = imageUploadId
        ? await transaction.productPhotoUpload.findFirst({
            where: {
              id: imageUploadId,
              ownerId: actorId,
              shopId: input.shopId,
              productId: null,
              attachedAt: null,
              deletedAt: null,
            },
          })
        : null;
      if (imageUploadId && !upload) throw new Error("PHOTO_UPLOAD_NOT_OWNED");
      const product = await transaction.product.create({
        data: {
          ...fields,
          imageUrl: upload
            ? publicPhotoUrl(upload.storageKey)
            : fields.imageUrl,
          imageStorageKey: upload?.storageKey ?? null,
          discountTiers: {
            create: discountTiers.map((tier, index) => ({
              ...tier,
              position: index + 1,
            })),
          },
        },
        select: productSelect,
      });
      if (upload) {
        const claimed = await transaction.productPhotoUpload.updateMany({
          where: { id: upload.id, attachedAt: null, deletedAt: null },
          data: { productId: product.id, attachedAt: new Date() },
        });
        if (claimed.count !== 1) throw new Error("PHOTO_UPLOAD_NOT_OWNED");
      }
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
    }, productWriteTransaction);
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
              shopId: true,
              imageUrl: true,
              imageStorageKey: true,
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
          const upload = input.imageUploadId
            ? await transaction.productPhotoUpload.findFirst({
                where: {
                  id: input.imageUploadId,
                  ownerId: actorId,
                  shopId: previous.shopId,
                  attachedAt: null,
                  deletedAt: null,
                  OR: [{ productId: null }, { productId }],
                },
              })
            : null;
          if (input.imageUploadId && !upload)
            throw new Error("PHOTO_UPLOAD_NOT_OWNED");
          if (
            !upload &&
            input.imageUrl !== previous.imageUrl &&
            input.imageUrl !== null
          )
            throw new Error("PHOTO_REFERENCE_INVALID");
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
              imageUrl: upload
                ? publicPhotoUrl(upload.storageKey)
                : input.imageUrl,
              imageStorageKey:
                upload?.storageKey ??
                (input.imageUrl === null ? null : previous.imageStorageKey),
              isAvailable: input.isAvailable,
              ...(input.lowStockThreshold === undefined
                ? {}
                : { lowStockThreshold: input.lowStockThreshold }),
            },
            select: productSelect,
          });
          if (upload) {
            const claimed = await transaction.productPhotoUpload.updateMany({
              where: { id: upload.id, attachedAt: null, deletedAt: null },
              data: { productId, attachedAt: new Date() },
            });
            if (claimed.count !== 1) throw new Error("PHOTO_UPLOAD_NOT_OWNED");
          }
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
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          ...productWriteTransaction,
        },
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
