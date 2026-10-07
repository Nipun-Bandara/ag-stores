import Link from "next/link";

import { CategoryCard } from "@/features/storefront/components/category-card";
import { ProductGrid } from "@/features/storefront/components/product-grid";
import { StorefrontFooter } from "@/features/storefront/components/storefront-footer";
import { StorefrontHeader } from "@/features/storefront/components/storefront-header";
import { getDictionary, routePath } from "@/lib/i18n/config";
import { getLocaleContext } from "@/lib/i18n/server";
import {
  listStorefrontCategories,
  listStorefrontProducts,
} from "@/services/storefront.service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [localeContext, categories, products] = await Promise.all([
    getLocaleContext(),
    listStorefrontCategories(8),
    listStorefrontProducts({ limit: 8 }),
  ]);
  const { locale, localizedRoute } = localeContext;
  const copy = getDictionary(locale).storefront;

  return (
    <div className="min-h-screen bg-[#fffdf7]">
      <StorefrontHeader locale={locale} localizedRoute={localizedRoute} />
      <main>
        <section className="relative overflow-hidden border-b border-emerald-950/10 bg-amber-50">
          <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-lime-200/50 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-orange-200/40 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:px-8">
            <div>
              <p className="text-sm font-black tracking-[0.22em] text-emerald-700 uppercase">
                {copy.tagline}
              </p>
              <h1 className="mt-5 max-w-3xl text-4xl leading-tight font-black tracking-tight text-emerald-950 sm:text-6xl">
                {copy.heroTitle}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-neutral-600 sm:text-lg">
                {copy.heroDescription}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={routePath("/products", locale, localizedRoute)}
                  className="rounded-full bg-emerald-950 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/15"
                >
                  {copy.browseProducts}
                </Link>
                <Link
                  href={routePath("/#categories", locale, localizedRoute)}
                  className="rounded-full border border-emerald-950/20 bg-white px-6 py-3 text-sm font-bold text-emerald-950"
                >
                  {copy.shopByCategory}
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3" aria-hidden="true">
              <div className="mt-10 rounded-[2rem] bg-emerald-900 p-6 text-white shadow-xl">
                <p className="text-5xl">🥬</p>
                <p className="mt-10 text-lg font-bold">{copy.freshPicks}</p>
                <p className="mt-1 text-sm text-emerald-100/70">
                  {copy.fromLocalShelves}
                </p>
              </div>
              <div className="rounded-[2rem] bg-orange-200 p-6 text-orange-950 shadow-xl">
                <p className="text-5xl">🛍️</p>
                <p className="mt-10 text-lg font-bold">{copy.easyShopping}</p>
                <p className="mt-1 text-sm text-orange-950/60">
                  {copy.simpleReliable}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="categories"
          className="mx-auto max-w-7xl scroll-mt-6 px-4 py-14 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-emerald-700">
                {copy.explore}
              </p>
              <h2 className="mt-1 text-3xl font-black tracking-tight text-emerald-950">
                {copy.shopByCategory}
              </h2>
            </div>
            <Link
              href={routePath("/products", locale, localizedRoute)}
              className="text-sm font-bold text-emerald-800"
            >
              {copy.viewAllProducts}
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                locale={locale}
                localizedRoute={localizedRoute}
              />
            ))}
          </div>
        </section>

        <section className="bg-emerald-50/70 py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-emerald-700">
                  {copy.availableNow}
                </p>
                <h2 className="mt-1 text-3xl font-black tracking-tight text-emerald-950">
                  {copy.browseShelves}
                </h2>
              </div>
              <Link
                href={routePath("/products", locale, localizedRoute)}
                className="text-sm font-bold text-emerald-800"
              >
                {copy.seeEverything}
              </Link>
            </div>
            <div className="mt-8">
              <ProductGrid
                products={products}
                locale={locale}
                localizedRoute={localizedRoute}
              />
            </div>
          </div>
        </section>
      </main>
      <StorefrontFooter locale={locale} />
    </div>
  );
}
