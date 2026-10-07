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
        <h1 className="mt-1 text-4xl font-black tracking-tight text-emerald-950">
          {copy.allProducts}
        </h1>
        <p className="mt-3 max-w-2xl text-neutral-600">
          {copy.searchDescription}
        </p>
        <form className="mt-8 grid gap-4 rounded-2xl border border-emerald-950/10 bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:p-5">
          <label
            htmlFor="search"
            className="text-sm font-semibold text-emerald-950"
          >
            {copy.searchProducts}
            <input
              id="search"
              name="search"
              defaultValue={search?.success ? search.data : ""}
              placeholder={copy.searchPlaceholder}
              className="mt-1.5 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </label>
          <label
            htmlFor="categoryId"
            className="text-sm font-semibold text-emerald-950"
          >
            {copy.category}
            <select
              id="categoryId"
              name="categoryId"
              defaultValue={category?.success ? category.data : ""}
              className="mt-1.5 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="">{copy.allCategories}</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {localizeBilingual(item.nameEn, item.nameSi, locale)} ·{" "}
                  {item.shopName}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-11 self-end rounded-xl bg-emerald-950 px-5 text-sm font-bold text-white"
          >
            {copy.applyFilters}
          </button>
        </form>
        <p className="mt-8 text-sm font-semibold text-neutral-500">
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
