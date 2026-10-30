import { getServerText } from "@/lib/i18n/server";
import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { ProductGrid } from "@/features/storefront/components/product-grid";
import { getDictionary, localizeBilingual } from "@/lib/i18n/config";
import { getLocaleContext } from "@/lib/i18n/server";
import {
  getStorefrontCategory,
  listStorefrontProducts,
} from "@/services/storefront.service";
import { categoryIdSchema } from "@/validations/category";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Category")} | AG Stores` };
}

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
    <section className="min-w-0 w-full">
      <p className="text-sm font-medium text-muted-foreground">
        {category.shopName}
      </p>
      <h1 className="mt-1 break-words text-3xl font-semibold tracking-tight text-foreground">
        {categoryName}
      </h1>
      <p className="mt-7 text-sm font-semibold text-muted-foreground">
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
    </section>
  );
}
