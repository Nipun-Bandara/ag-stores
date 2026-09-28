import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type {
  ProductAvailabilityInput,
  ProductCreateInput,
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
  update(productId: string, input: ProductUpdateInput): Promise<ProductRecord>;
  setAvailabilityOwned(
    ownerId: string,
    productId: string,
    input: ProductAvailabilityInput,
  ): Promise<ProductRecord | null>;
  updateStockOwned(
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
    return this.prisma.product.findMany({
      where: {
        shop: { ownerId },
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

  update(productId: string, input: ProductUpdateInput): Promise<ProductRecord> {
    return this.prisma.product.update({
      where: { id: productId },
      data: input,
      select: productSelect,
    });
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
    ownerId: string,
    productId: string,
    input: ProductStockInput,
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
}
