import Link from "next/link";

import {
  getDictionary,
  localizeBilingual,
  routePath,
  type Locale,
} from "@/lib/i18n/config";
import type { StorefrontCategoryView } from "@/services/storefront.service";
import { Card } from "@/components/ui/card";

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
      className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      data-testid="category-card"
    >
      <Card className="h-full gap-0 group p-5 transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-100 text-xl font-black text-emerald-900">
          {name.charAt(0).toUpperCase()}
        </div>
        <h3 className="mt-5 text-lg font-bold text-foreground">{name}</h3>
        {locale === "en" && category.nameSi ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {category.nameSi}
          </p>
        ) : null}
        <p className="mt-3 text-xs font-semibold tracking-wide text-emerald-700 uppercase">
          {category.productCount}{" "}
          {category.productCount === 1
            ? getDictionary(locale).storefront.product
            : getDictionary(locale).storefront.productPlural}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {category.shopName}
        </p>
      </Card>
    </Link>
  );
}
