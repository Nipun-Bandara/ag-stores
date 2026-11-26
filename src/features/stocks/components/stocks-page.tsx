import { Suspense } from "react";
import type { AuthenticatedUser } from "@/types/auth";
import { getServerText, getLocaleContext } from "@/lib/i18n/server";
import { localizeBilingual } from "@/lib/i18n/config";
import { parseProductPage } from "@/lib/product-pagination";
import {
  productCategoryFilterSchema,
  productSearchSchema,
} from "@/validations/product";
import { getStockPage } from "@/services/stock.service";
import { StorefrontFilters } from "@/features/storefront/components/storefront-filters";
import { ProductPagination } from "@/features/products/components/product-pagination";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

export type StockQuery = Promise<{
  categoryId?: string | string[];
  search?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
}>;

export function StocksSkeleton() {
  return (
    <div className="mt-6 space-y-5" role="status" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex gap-4">
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-12 w-24" />
          <Skeleton className="h-12 w-20" />
        </div>
      ))}
    </div>
  );
}

export async function StocksPage({
  user,
  searchParams,
}: {
  user: AuthenticatedUser;
  searchParams: StockQuery;
}) {
  const t = await getServerText();
  return (
    <section className="w-full min-w-0">
      <h1 className="text-3xl font-semibold tracking-tight">{t("Stocks")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("Check stock levels by category across your shops.")}
      </p>
      <Suspense fallback={<StocksSkeleton />}>
        <StockContent user={user} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function StockContent({
  user,
  searchParams,
}: {
  user: AuthenticatedUser;
  searchParams: StockQuery;
}) {
  const query = await searchParams;
  const scalar = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const category = productCategoryFilterSchema.safeParse(
    scalar(query.categoryId),
  );
  const search = productSearchSchema.safeParse(scalar(query.search));
  const filters = {
    ...(category.success ? { categoryId: category.data } : {}),
    ...(search.success && search.data ? { search: search.data } : {}),
  };
  const [data, { locale }, t] = await Promise.all([
    getStockPage(user, filters, parseProductPage(query)),
    getLocaleContext(),
    getServerText(),
  ]);
  const quantity = (value: number, unit: string) =>
    `${new Intl.NumberFormat(locale === "si" ? "si-LK" : "en-LK", { maximumFractionDigits: 3 }).format(value)} ${unit === "KG" ? t("kg") : t("units")}`;
  const labels: Record<string, string> = {
    OUT_OF_STOCK: t("Out of stock"),
    LOW_STOCK: t("Low stock"),
    AVAILABLE: t("In stock"),
  };
  return (
    <div className="mt-6 min-w-0">
      <StorefrontFilters
        categoryOptions={[
          { value: "", label: t("All categories") },
          ...data.categories.map((category) => ({
            value: category.id,
            label: `${localizeBilingual(category.nameEn, category.nameSi, locale)} · ${category.shop.name}`,
          })),
        ]}
        initialSearch={filters.search ?? ""}
        initialCategoryId={filters.categoryId ?? ""}
        copy={{
          searchProducts: t("Search items"),
          searchPlaceholder: t("Name, item code or barcode"),
          category: t("Category"),
          allCategories: t("All categories"),
        }}
      />
      <ProductPagination {...data} />
      {data.rows.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Product")}</TableHead>
              <TableHead>{t("Shop")}</TableHead>
              <TableHead className="text-right">{t("Stock")}</TableHead>
              <TableHead className="text-right">
                {t("Low-stock threshold")}
              </TableHead>
              <TableHead>{t("Status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="min-w-40 whitespace-normal">
                  <div className="font-medium">
                    {localizeBilingual(row.nameEn, row.nameSi, locale)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {localizeBilingual(
                      row.category.nameEn,
                      row.category.nameSi,
                      locale,
                    )}
                    {row.itemCode ? ` · ${row.itemCode}` : ""}
                  </div>
                </TableCell>
                <TableCell className="max-w-48 whitespace-normal">
                  {row.shop.name}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {quantity(row.stockQuantity, row.sellingUnit)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {quantity(row.lowStockThreshold, row.sellingUnit)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge
                      variant={
                        row.inventoryStatus === "OUT_OF_STOCK"
                          ? "destructive"
                          : row.inventoryStatus === "LOW_STOCK"
                            ? "warning"
                            : "success"
                      }
                    >
                      {labels[row.inventoryStatus]}
                    </Badge>
                    {!row.isAvailable ? (
                      <Badge variant="muted">{t("Unavailable")}</Badge>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("No stock items found")}</EmptyTitle>
            <EmptyDescription>
              {t("Try another category or search term.")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {data.total > 0 ? <ProductPagination {...data} compact /> : null}
    </div>
  );
}
