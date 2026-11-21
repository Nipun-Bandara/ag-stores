import { parseProductPage } from "@/lib/product-pagination";
import { ProductPagination } from "@/features/products/components/product-pagination";
import { getServerText } from "@/lib/i18n/server";
import { Text } from "@/features/i18n/components/text";
import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { ProductGrid } from "@/features/storefront/components/product-grid";
import { InfiniteProductList } from "@/features/storefront/components/infinite-product-list";
import { getDictionary, localizeBilingual } from "@/lib/i18n/config";
import { getLocaleContext } from "@/lib/i18n/server";
import {
  getStorefrontCategory,
  getStorefrontProductPage,
} from "@/services/storefront.service";
import { categoryIdSchema } from "@/validations/category";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Category")} | AG Stores` };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    page?: string | string[];
    pageSize?: string | string[];
  }>;
}) {
  const pagination = parseProductPage(await searchParams);
  const categoryId = categoryIdSchema.safeParse((await params).id);
  if (!categoryId.success) notFound();

  const [localeContext, category, products] = await Promise.all([
    getLocaleContext(),
    getStorefrontCategory(categoryId.data),
    getStorefrontProductPage({ categoryId: categoryId.data }, pagination),
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
    <section className="min-w-0 w-full">
      <p className="text-sm font-medium text-muted-foreground">
        {category.shopName}
      </p>
      <h1 className="mt-1 break-words text-3xl font-semibold tracking-tight text-foreground">
        {categoryName}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <Text value="Highest discounts first, based on the minimum order quantity." />
      </p>
      {/* Phones scroll through pages instead of using numbered pagination. */}
      <div className="max-md:hidden">
        <ProductPagination {...products} />
      </div>
      <div className="mt-4">
        <ProductGrid
          products={products.products}
          locale={locale}
          localizedRoute={localizedRoute}
          emptyMessage={copy.noCategoryProducts}
        />
      </div>
      <InfiniteProductList
        key={`${category.id}|${products.pageSize}|${products.page}`}
        initialPage={products.page}
        pageCount={products.pageCount}
        pageSize={products.pageSize}
        initialProductIds={products.products.map((product) => product.id)}
        categoryId={category.id}
        locale={locale}
        localizedRoute={localizedRoute}
      />
      {products.total > 0 ? (
        <div className="max-md:hidden">
          <ProductPagination {...products} compact />
        </div>
      ) : null}
    </section>
  );
}
