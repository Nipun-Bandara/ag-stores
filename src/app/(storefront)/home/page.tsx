import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { ProductTile } from "@/features/storefront/components/product-tile";
import { getDictionary, localizeBilingual, routePath } from "@/lib/i18n/config";
import { getLocaleContext, getServerText } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n/text";
import {
  listStorefrontCategories,
  listStorefrontProducts,
} from "@/services/storefront.service";

/** Category rows on the home page, and products shown in each row. */
const HOME_ROW_LIMIT = 6;
const PRODUCTS_PER_ROW = 10;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return {
    title: `${t("Home")} | AG Stores`,
    description: t("Browse available products from local shops."),
  };
}

export default async function StoreHomePage() {
  const [{ locale, localizedRoute }, categories] = await Promise.all([
    getLocaleContext(),
    listStorefrontCategories(),
  ]);
  const copy = getDictionary(locale).storefront;
  const href = (path: string) => routePath(path, locale, localizedRoute);
  const stocked = categories.filter((category) => category.productCount > 0);
  // Rows lead with each category's best discounts (the repository's order).
  const rows = (
    await Promise.all(
      stocked.slice(0, HOME_ROW_LIMIT).map(async (category) => ({
        category,
        products: await listStorefrontProducts({
          categoryId: category.id,
          limit: PRODUCTS_PER_ROW,
        }),
      })),
    )
  ).filter((row) => row.products.length > 0);

  return (
    <section className="min-w-0 w-full">
      <h1 className="sr-only">{translate(locale, "Home")}</h1>
      <form
        action={href("/products")}
        method="get"
        role="search"
        className="relative"
      >
        <label htmlFor="home-search" className="sr-only">
          {copy.searchProducts}
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id="home-search"
          name="search"
          type="search"
          maxLength={180}
          placeholder={copy.searchPlaceholder}
          className="h-12 w-full rounded-full border border-input bg-card pl-10 pr-24 text-base shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <button
          type="submit"
          className={buttonVariants({
            size: "sm",
            className:
              "absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full",
          })}
        >
          {translate(locale, "Search")}
        </button>
      </form>

      {stocked.length > 0 ? (
        <nav aria-label={copy.shopByCategory} className="-mx-4 mt-5 lg:-mx-6">
          <h2 className="px-4 text-sm font-semibold text-muted-foreground lg:px-6">
            {copy.shopByCategory}
          </h2>
          <ul className="mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:px-6">
            {stocked.map((category) => (
              <li key={category.id} className="shrink-0">
                <Link
                  href={href(`/categories/${category.id}`)}
                  className="inline-flex h-9 items-center rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground no-underline transition-colors hover:border-primary hover:text-primary dark:hover:text-indigo-300"
                >
                  {localizeBilingual(category.nameEn, category.nameSi, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {rows.length === 0 ? (
        <Empty className="mt-8">
          <EmptyHeader>
            <EmptyTitle>{copy.noMatches}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Link href={href("/products")} className={buttonVariants()}>
              {copy.browseProducts}
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        rows.map(({ category, products }) => {
          const label = localizeBilingual(
            category.nameEn,
            category.nameSi,
            locale,
          );
          return (
            <section
              key={category.id}
              aria-label={label}
              className="-mx-4 mt-7 lg:-mx-6"
              data-testid="home-category-row"
            >
              <div className="flex items-center justify-between gap-3 px-4 lg:px-6">
                <h2 className="min-w-0 truncate text-lg font-semibold">
                  {label}
                </h2>
                <Link
                  href={href(`/categories/${category.id}`)}
                  className="inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-primary no-underline dark:text-indigo-300"
                  aria-label={`${translate(locale, "See all")}: ${label}`}
                >
                  {translate(locale, "See all")}
                  <ChevronRight aria-hidden className="size-4" />
                </Link>
              </div>
              <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] lg:scroll-px-6 lg:px-6">
                {products.map((product) => (
                  <ProductTile
                    key={product.id}
                    product={product}
                    locale={locale}
                    localizedRoute={localizedRoute}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}
    </section>
  );
}
