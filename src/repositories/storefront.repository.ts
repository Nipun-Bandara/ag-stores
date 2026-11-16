import { DEFAULT_PRODUCT_PAGE_SIZE } from "@/lib/product-pagination";
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
  discountTiers: {
    orderBy: { position: "asc" as const },
    select: { minimumQuantity: true, discountAmount: true },
  },
  sellingUnit: true,
  minimumOrderQuantity: true,
  orderingIncrement: true,
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
  page?: number;
  pageSize?: number;
}

export interface StorefrontRepository {
  findCategories(limit?: number): Promise<StorefrontCategoryRecord[]>;
  findCategoryById(
    categoryId: string,
  ): Promise<StorefrontCategoryRecord | null>;
  findProducts(
    filters: StorefrontProductFilters,
  ): Promise<StorefrontProductRecord[]>;
  countProducts(filters: StorefrontProductFilters): Promise<number>;
  findProductById(productId: string): Promise<StorefrontProductRecord | null>;
}

function storefrontWhere(
  filters: StorefrontProductFilters,
): Prisma.ProductWhereInput {
  const search = filters.search;
  return {
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
  };
}

export class PrismaStorefrontRepository implements StorefrontRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findCategories(limit?: number): Promise<StorefrontCategoryRecord[]> {
    return this.prisma.category.findMany({
      where: { status: CatalogStatus.ACTIVE, shop: { isActive: true } },
      orderBy: [{ nameEn: "asc" }, { shop: { name: "asc" } }, { id: "asc" }],
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

  async findProducts(
    filters: StorefrontProductFilters,
  ): Promise<StorefrontProductRecord[]> {
    if (filters.categoryId) return this.findCategoryProductsByDiscount(filters);
    return this.prisma.product.findMany({
      where: storefrontWhere(filters),
      orderBy: [{ nameEn: "asc" }, { shop: { name: "asc" } }, { id: "asc" }],
      skip:
        ((filters.page ?? 1) - 1) *
        (filters.pageSize ?? DEFAULT_PRODUCT_PAGE_SIZE),
      take: Math.min(
        filters.limit ?? filters.pageSize ?? DEFAULT_PRODUCT_PAGE_SIZE,
        48,
      ),
      select: storefrontProductSelect,
    });
  }

  private async findCategoryProductsByDiscount(
    filters: StorefrontProductFilters,
  ): Promise<StorefrontProductRecord[]> {
    const search = filters.search
      ? `%${filters.search.replace(/[\\%_]/g, "\\$&")}%`
      : undefined;
    // Rank the discount customers actually see at the minimum purchasable quantity.
    // Ordering happens in PostgreSQL before pagination, never on a single fetched page.
    const ids = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT p.id FROM products p
      JOIN shops s ON s.id = p."shopId"
      JOIN categories c ON c.id = p."categoryId"
      LEFT JOIN LATERAL (
        SELECT t."discountAmount" FROM product_discount_tiers t
        WHERE t."productId" = p.id AND t."minimumQuantity" <= CASE
          WHEN p."sellingUnit" = 'KG' THEN GREATEST(p."minimumOrderQuantity", 0.002)
          ELSE CEIL(p."minimumOrderQuantity" / NULLIF(p."orderingIncrement", 0)) * p."orderingIncrement"
        END
        ORDER BY t."minimumQuantity" DESC LIMIT 1
      ) discount ON TRUE
      WHERE p."isAvailable" = TRUE AND s."isActive" = TRUE AND c.status = 'ACTIVE'
        AND p."categoryId" = ${filters.categoryId}::uuid
        ${search ? Prisma.sql`AND (p."nameEn" ILIKE ${search} OR p."nameSi" ILIKE ${search} OR p."descriptionEn" ILIKE ${search} OR p."descriptionSi" ILIKE ${search})` : Prisma.empty}
      ORDER BY COALESCE(discount."discountAmount" / NULLIF(p.price, 0), 0) DESC,
        p."nameEn" ASC, s.name ASC, p.id ASC
      LIMIT ${Math.min(filters.limit ?? filters.pageSize ?? DEFAULT_PRODUCT_PAGE_SIZE, 48)}
      OFFSET ${((filters.page ?? 1) - 1) * (filters.pageSize ?? DEFAULT_PRODUCT_PAGE_SIZE)}
    `);
    if (!ids.length) return [];
    const rows = await this.prisma.product.findMany({
      where: {
        ...storefrontWhere(filters),
        id: { in: ids.map(({ id }) => id) },
      },
      select: storefrontProductSelect,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.flatMap(({ id }) => {
      const row = byId.get(id);
      return row ? [row] : [];
    });
  }

  countProducts(filters: StorefrontProductFilters): Promise<number> {
    return this.prisma.product.count({ where: storefrontWhere(filters) });
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
