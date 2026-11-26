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

/** Visibility rules shared by every storefront query (search is in SQL). */
function storefrontWhere(
  filters: StorefrontProductFilters,
): Prisma.ProductWhereInput {
  return {
    isAvailable: true,
    shop: { isActive: true },
    category: { status: CatalogStatus.ACTIVE },
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
  };
}

/** Typo tolerance: pg_trgm word similarity needed to count as a match. */
export const SEARCH_SIMILARITY_THRESHOLD = 0.5;
const MAX_SEARCH_TERMS = 6;

function likePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

/** Lower-cased words of a search, at most six, ready for ILIKE '%word%'. */
export function searchTerms(search: string): string[] {
  return search
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_SEARCH_TERMS)
    .map((term) => `%${likePattern(term)}%`);
}

/**
 * Shoppers rarely type exact names. A product matches when every word of the
 * search appears somewhere in its names, descriptions or category name, in
 * any order ("rice basmati" finds "Basmati Rice 5kg"), or, with pg_trgm, when
 * the search is close to its name or category despite typos ("choclate").
 */
function searchCondition(search: string, fuzzy: boolean): Prisma.Sql {
  const everyWord = Prisma.join(
    searchTerms(search).map(
      (term) => Prisma.sql`(p."nameEn" ILIKE ${term} OR p."nameSi" ILIKE ${term}
        OR p."descriptionEn" ILIKE ${term} OR p."descriptionSi" ILIKE ${term}
        OR c."nameEn" ILIKE ${term} OR c."nameSi" ILIKE ${term})`,
    ),
    " AND ",
  );
  if (!fuzzy) return Prisma.sql`(${everyWord})`;
  return Prisma.sql`((${everyWord})
    OR word_similarity(${search}, p."nameEn") >= ${SEARCH_SIMILARITY_THRESHOLD}
    OR word_similarity(${search}, c."nameEn") >= ${SEARCH_SIMILARITY_THRESHOLD})`;
}

/** Best matches first: names starting with the search, then closest names. */
function searchOrder(search: string, fuzzy: boolean): Prisma.Sql {
  const prefix = `${likePattern(search.toLowerCase())}%`;
  return fuzzy
    ? Prisma.sql`(p."nameEn" ILIKE ${prefix}) DESC,
        word_similarity(${search}, p."nameEn") DESC,
        p."nameEn" ASC, s.name ASC, p.id ASC`
    : Prisma.sql`(p."nameEn" ILIKE ${prefix}) DESC,
        p."nameEn" ASC, s.name ASC, p.id ASC`;
}

function visibleProductsSql(filters: StorefrontProductFilters): Prisma.Sql {
  return Prisma.sql`p."isAvailable" = TRUE AND s."isActive" = TRUE
    AND c.status = 'ACTIVE'
    ${filters.categoryId ? Prisma.sql`AND p."categoryId" = ${filters.categoryId}::uuid` : Prisma.empty}`;
}

function pageWindow(filters: StorefrontProductFilters) {
  const pageSize = filters.pageSize ?? DEFAULT_PRODUCT_PAGE_SIZE;
  return {
    limit: Math.min(filters.limit ?? pageSize, 48),
    offset: ((filters.page ?? 1) - 1) * pageSize,
  };
}

/** False once the database is found to lack pg_trgm; search then stays exact. */
let trigramSearchAvailable = true;

function isMissingTrigramFunction(error: unknown): boolean {
  const text = String(
    error instanceof Error
      ? `${error.message} ${JSON.stringify(error)}`
      : error,
  );
  return /word_similarity|42883/.test(text);
}

/** Runs a search with typo tolerance, falling back to exact words without it. */
async function withTrigramFallback<T>(
  run: (fuzzy: boolean) => Promise<T>,
): Promise<T> {
  if (!trigramSearchAvailable) return run(false);
  try {
    return await run(true);
  } catch (error) {
    if (!isMissingTrigramFunction(error)) throw error;
    trigramSearchAvailable = false;
    console.warn(
      "pg_trgm is not installed; storefront search falls back to word matching. Run the product search migration.",
    );
    return run(false);
  }
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
    if (filters.search?.trim()) return this.findSearchResults(filters);
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

  private async findSearchResults(
    filters: StorefrontProductFilters,
  ): Promise<StorefrontProductRecord[]> {
    const search = filters.search!.trim();
    const { limit, offset } = pageWindow(filters);
    const ids = await withTrigramFallback((fuzzy) =>
      this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT p.id FROM products p
        JOIN shops s ON s.id = p."shopId"
        JOIN categories c ON c.id = p."categoryId"
        WHERE ${visibleProductsSql(filters)} AND ${searchCondition(search, fuzzy)}
        ORDER BY ${searchOrder(search, fuzzy)}
        LIMIT ${limit} OFFSET ${offset}
      `),
    );
    return this.loadInOrder(filters, ids);
  }

  private async findCategoryProductsByDiscount(
    filters: StorefrontProductFilters,
  ): Promise<StorefrontProductRecord[]> {
    const { limit, offset } = pageWindow(filters);
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
      WHERE ${visibleProductsSql(filters)}
      ORDER BY COALESCE(discount."discountAmount" / NULLIF(p.price, 0), 0) DESC,
        p."nameEn" ASC, s.name ASC, p.id ASC
      LIMIT ${limit} OFFSET ${offset}
    `);
    return this.loadInOrder(filters, ids);
  }

  /** Full records for ids chosen in SQL, keeping the SQL order. */
  private async loadInOrder(
    filters: StorefrontProductFilters,
    ids: { id: string }[],
  ): Promise<StorefrontProductRecord[]> {
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

  async countProducts(filters: StorefrontProductFilters): Promise<number> {
    const search = filters.search?.trim();
    if (!search) {
      return this.prisma.product.count({ where: storefrontWhere(filters) });
    }
    const rows = await withTrigramFallback((fuzzy) =>
      this.prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
        SELECT count(*)::int AS count FROM products p
        JOIN shops s ON s.id = p."shopId"
        JOIN categories c ON c.id = p."categoryId"
        WHERE ${visibleProductsSql(filters)} AND ${searchCondition(search, fuzzy)}
      `),
    );
    return Number(rows[0]?.count ?? 0);
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
