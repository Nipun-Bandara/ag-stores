import Link from "next/link";

import { CartNavigationLink } from "@/features/cart/components/cart-navigation-link";
import { LanguageSwitcher } from "@/features/i18n/components/language-switcher";
import { LocaleDocument } from "@/features/i18n/components/locale-document";
import { getDictionary, routePath, type Locale } from "@/lib/i18n/config";

export function StorefrontHeader({
  locale = "en",
  localizedRoute = false,
}: {
  locale?: Locale;
  localizedRoute?: boolean;
}) {
  const copy = getDictionary(locale).common;

  return (
    <header className="border-b border-emerald-950/10 bg-amber-50/80 backdrop-blur">
      <LocaleDocument locale={locale} />
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href={routePath("/", locale, localizedRoute)}
          className="text-lg font-black tracking-tight text-emerald-950"
        >
          {copy.brand}
        </Link>
        <nav
          aria-label="Storefront navigation"
          className="order-3 flex w-full items-center gap-5 text-sm font-semibold text-emerald-950 sm:order-2 sm:w-auto"
        >
          <Link href={routePath("/products", locale, localizedRoute)}>
            {copy.products}
          </Link>
          <Link href={routePath("/#categories", locale, localizedRoute)}>
            {copy.categories}
          </Link>
        </nav>
        <div className="order-2 flex items-center gap-2 text-sm sm:order-3">
          <LanguageSwitcher locale={locale} label={copy.language} />
          <CartNavigationLink
            locale={locale}
            localizedRoute={localizedRoute}
            cartLabel={copy.cart}
            itemLabel={copy.item}
            itemsLabel={copy.items}
            withLabel={copy.with}
          />
          <Link
            href={routePath("/login", locale, localizedRoute)}
            className="rounded-full px-3 py-2 font-semibold text-emerald-950"
          >
            {copy.signIn}
          </Link>
          <Link
            href={routePath("/register", locale, localizedRoute)}
            className="rounded-full bg-emerald-950 px-4 py-2 font-semibold text-white"
          >
            {copy.register}
          </Link>
        </div>
      </div>
    </header>
  );
}
