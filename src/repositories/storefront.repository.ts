import {
  CatalogStatus,
  Prisma,
  type PrismaClient,
} from "@/generated/prisma/client";

const storefrontCategorySelect = {
  id: true,
  shopId: true,
  nameEn: true,
  nameSi: true,
  shop: { select: { name: true } },
  _count: {
    select: { products: { where: { isAvailable: true } } },
  },
} satisfies Prisma.CategorySelect;

const storefrontProductSelect = {
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
  shop: { select: { name: true } },
  category: { select: { nameEn: true, nameSi: true } },
} satisfies Prisma.ProductSelect;

export type StorefrontCategoryRecord = Prisma.CategoryGetPayload<{
  select: typeof storefrontCategorySelect;
}>;

export type StorefrontProductRecord = Prisma.ProductGetPayload<{
  select: typeof storefrontProductSelect;
}>;

export interface StorefrontProductFilters {
  categoryId?: string;
  search?: string;
  limit?: number;
}

export interface StorefrontRepository {
  findCategories(limit?: number): Promise<StorefrontCategoryRecord[]>;
  findCategoryById(
    categoryId: string,
  ): Promise<StorefrontCategoryRecord | null>;
  findProducts(
    filters: StorefrontProductFilters,
  ): Promise<StorefrontProductRecord[]>;
  findProductById(productId: string): Promise<StorefrontProductRecord | null>;
}

export class PrismaStorefrontRepository implements StorefrontRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findCategories(limit?: number): Promise<StorefrontCategoryRecord[]> {
    return this.prisma.category.findMany({
      where: { status: CatalogStatus.ACTIVE, shop: { isActive: true } },
      orderBy: [{ nameEn: "asc" }, { shop: { name: "asc" } }],
      ...(limit ? { take: limit } : {}),
      select: storefrontCategorySelect,
    });
  }

  findCategoryById(
    categoryId: string,
  ): Promise<StorefrontCategoryRecord | null> {
    return this.prisma.category.findFirst({
      where: {
        id: categoryId,
        status: CatalogStatus.ACTIVE,
        shop: { isActive: true },
      },
      select: storefrontCategorySelect,
    });
  }

  findProducts(
    filters: StorefrontProductFilters,
  ): Promise<StorefrontProductRecord[]> {
    const search = filters.search;
    return this.prisma.product.findMany({
      where: {
        isAvailable: true,
        shop: { isActive: true },
        category: { status: CatalogStatus.ACTIVE },
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
      orderBy: [{ nameEn: "asc" }, { shop: { name: "asc" } }],
      ...(filters.limit ? { take: filters.limit } : {}),
      select: storefrontProductSelect,
    });
  }

  findProductById(productId: string): Promise<StorefrontProductRecord | null> {
    return this.prisma.product.findFirst({
      where: {
        id: productId,
        isAvailable: true,
        shop: { isActive: true },
        category: { status: CatalogStatus.ACTIVE },
      },
      select: storefrontProductSelect,
    });
  }
}
