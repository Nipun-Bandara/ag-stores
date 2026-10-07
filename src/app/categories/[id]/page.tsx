import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { ProductGrid } from "@/features/storefront/components/product-grid";
import { StorefrontFooter } from "@/features/storefront/components/storefront-footer";
import { StorefrontHeader } from "@/features/storefront/components/storefront-header";
import { getDictionary, localizeBilingual } from "@/lib/i18n/config";
import { getLocaleContext } from "@/lib/i18n/server";
import {
  getStorefrontCategory,
  listStorefrontProducts,
} from "@/services/storefront.service";
import { categoryIdSchema } from "@/validations/category";

export const metadata: Metadata = { title: "Category | AG Stores" };

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const categoryId = categoryIdSchema.safeParse((await params).id);
  if (!categoryId.success) notFound();

  const [localeContext, category, products] = await Promise.all([
    getLocaleContext(),
    getStorefrontCategory(categoryId.data),
    listStorefrontProducts({ categoryId: categoryId.data }),
  ]);
  if (!category) notFound();
  const { locale, localizedRoute } = localeContext;
  const copy = getDictionary(locale).storefront;
  const categoryName = localizeBilingual(
    category.nameEn,
    category.nameSi,
    locale,
  );

  return (
    <div className="min-h-screen bg-[#fffdf7]">
      <StorefrontHeader locale={locale} localizedRoute={localizedRoute} />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <p className="text-sm font-bold text-emerald-700">
          {category.shopName}
        </p>
        <h1 className="mt-1 text-4xl font-black tracking-tight text-emerald-950">
          {categoryName}
        </h1>
        <p className="mt-7 text-sm font-semibold text-neutral-500">
          {products.length}{" "}
          {products.length === 1 ? copy.product : copy.productPlural}
        </p>
        <div className="mt-4">
          <ProductGrid
            products={products}
            locale={locale}
            localizedRoute={localizedRoute}
            emptyMessage={copy.noCategoryProducts}
          />
        </div>
      </main>
      <StorefrontFooter locale={locale} />
    </div>
  );
}
