import Link from "next/link";

import {
  getDictionary,
  localizeBilingual,
  routePath,
  type Locale,
} from "@/lib/i18n/config";
import type { StorefrontCategoryView } from "@/services/storefront.service";

export function CategoryCard({
  category,
  locale = "en",
  localizedRoute = false,
}: {
  category: StorefrontCategoryView;
  locale?: Locale;
  localizedRoute?: boolean;
}) {
  const name = localizeBilingual(category.nameEn, category.nameSi, locale);

  return (
    <Link
      href={routePath(`/categories/${category.id}`, locale, localizedRoute)}
      className="group rounded-2xl border border-emerald-950/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      data-testid="category-card"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-100 text-xl font-black text-emerald-900">
        {name.charAt(0).toUpperCase()}
      </div>
      <h3 className="mt-5 text-lg font-bold text-emerald-950">{name}</h3>
      {locale === "en" && category.nameSi ? (
        <p className="mt-1 text-sm text-neutral-500">{category.nameSi}</p>
      ) : null}
      <p className="mt-3 text-xs font-semibold tracking-wide text-emerald-700 uppercase">
        {category.productCount}{" "}
        {category.productCount === 1
          ? getDictionary(locale).storefront.product
          : getDictionary(locale).storefront.productPlural}
      </p>
      <p className="mt-1 text-xs text-neutral-500">{category.shopName}</p>
    </Link>
  );
}
