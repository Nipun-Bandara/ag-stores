import type { Metadata } from "next";

import { ProductGrid } from "@/features/storefront/components/product-grid";
import { StorefrontCartSummary } from "@/features/cart/components/storefront-cart-summary";
import { getDictionary, localizeBilingual } from "@/lib/i18n/config";
import { getLocaleContext, getServerText } from "@/lib/i18n/server";
import {
  listStorefrontCategories,
  listStorefrontProducts,
} from "@/services/storefront.service";
import {
  productCategoryFilterSchema,
  productSearchSchema,
} from "@/validations/product";
import { StorefrontFilters } from "@/features/storefront/components/storefront-filters";
import { Card } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return {
    title: `${t("Products")} | AG Stores`,
    description: t("Browse available products from local shops."),
  };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string | string[];
    categoryId?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const searchValue = Array.isArray(query.search)
    ? query.search[0]
    : query.search;
  const categoryValue = Array.isArray(query.categoryId)
    ? query.categoryId[0]
    : query.categoryId;
  const search = searchValue
    ? productSearchSchema.safeParse(searchValue)
    : undefined;
  const category = categoryValue
    ? productCategoryFilterSchema.safeParse(categoryValue)
    : undefined;
  const filters = {
    ...(search?.success && search.data ? { search: search.data } : {}),
    ...(category?.success ? { categoryId: category.data } : {}),
  };
  const [localeContext, products, categories] = await Promise.all([
    getLocaleContext(),
    listStorefrontProducts(filters),
    listStorefrontCategories(),
  ]);
  const { locale, localizedRoute } = localeContext;
  const copy = getDictionary(locale).storefront;
  const categoryOptions = [
    { value: "", label: copy.allCategories },
    ...categories.map((item) => ({
      value: item.id,
      label: `${localizeBilingual(item.nameEn, item.nameSi, locale)} · ${item.shopName}`,
    })),
  ];

  return (
    <section className="min-w-0 w-full pb-28 md:pb-0">
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {copy.allProducts}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        {copy.searchDescription}
      </p>
      <Card className="mt-5 gap-0 border-0 bg-transparent p-0 shadow-none ring-0">
        <StorefrontFilters
          categoryOptions={categoryOptions}
          initialSearch={search?.success ? search.data : ""}
          initialCategoryId={category?.success ? category.data : ""}
          copy={copy}
        />
      </Card>
      <StorefrontCartSummary locale={locale} localizedRoute={localizedRoute} />
      <p className="mt-5 text-xs text-muted-foreground">
        {products.length}{" "}
        {products.length === 1 ? copy.product : copy.productPlural}
      </p>
      <div className="mt-1">
        <ProductGrid
          products={products}
          locale={locale}
          localizedRoute={localizedRoute}
          emptyMessage={copy.noMatches}
        />
      </div>
    </section>
  );
}
