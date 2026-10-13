import type { Metadata } from "next";

import { ProductGrid } from "@/features/storefront/components/product-grid";
import { StorefrontFooter } from "@/features/storefront/components/storefront-footer";
import { StorefrontHeader } from "@/features/storefront/components/storefront-header";
import { getDictionary, localizeBilingual } from "@/lib/i18n/config";
import { getLocaleContext } from "@/lib/i18n/server";
import {
  listStorefrontCategories,
  listStorefrontProducts,
} from "@/services/storefront.service";
import {
  productCategoryFilterSchema,
  productSearchSchema,
} from "@/validations/product";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Products | AG Stores",
  description: "Browse available products from local shops.",
};

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

  return (
    <div className="min-h-screen bg-[#fffdf7]">
      <StorefrontHeader locale={locale} localizedRoute={localizedRoute} />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <p className="text-sm font-bold text-emerald-700">{copy.storefront}</p>
        <h1 className="mt-1 text-4xl font-black tracking-tight text-foreground">
          {copy.allProducts}
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          {copy.searchDescription}
        </p>
        <Card className="gap-0 mt-8 p-4 sm:p-5">
          <form className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
            <Label
              htmlFor="search"
              className="text-sm font-semibold text-foreground"
            >
              {copy.searchProducts}
              <Input
                id="search"
                name="search"
                defaultValue={search?.success ? search.data : ""}
                placeholder={copy.searchPlaceholder}
                className="mt-1.5 h-11 w-full"
              />
            </Label>
            <Label
              htmlFor="categoryId"
              className="text-sm font-semibold text-foreground"
            >
              {copy.category}
              <NativeSelect
                id="categoryId"
                name="categoryId"
                defaultValue={category?.success ? category.data : ""}
                className="mt-1.5 h-11 w-full"
              >
                <NativeSelectOption value="">
                  {copy.allCategories}
                </NativeSelectOption>
                {categories.map((item) => (
                  <NativeSelectOption key={item.id} value={item.id}>
                    {localizeBilingual(item.nameEn, item.nameSi, locale)} ·{" "}
                    {item.shopName}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Label>
            <Button type="submit" className="h-11 self-end">
              {copy.applyFilters}
            </Button>
          </form>
        </Card>
        <p className="mt-8 text-sm font-semibold text-muted-foreground">
          {products.length}{" "}
          {products.length === 1 ? copy.product : copy.productPlural}
        </p>
        <div className="mt-4">
          <ProductGrid
            products={products}
            locale={locale}
            localizedRoute={localizedRoute}
            emptyMessage={copy.noMatches}
          />
        </div>
      </main>
      <StorefrontFooter locale={locale} />
    </div>
  );
}
