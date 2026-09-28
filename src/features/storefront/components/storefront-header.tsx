import Link from "next/link";

import { storefrontCopy, type StorefrontLocale } from "@/lib/i18n/storefront";

export function StorefrontHeader({
  locale = "en",
}: {
  locale?: StorefrontLocale;
}) {
  const copy = storefrontCopy[locale];

  return (
    <header className="border-b border-emerald-950/10 bg-amber-50/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-lg font-black tracking-tight text-emerald-950"
        >
          {copy.brand}
        </Link>
        <nav
          aria-label="Storefront navigation"
          className="order-3 flex w-full items-center gap-5 text-sm font-semibold text-emerald-950 sm:order-2 sm:w-auto"
        >
          <Link href="/products">{copy.products}</Link>
          <Link href="/#categories">{copy.categories}</Link>
        </nav>
        <div className="order-2 flex items-center gap-2 text-sm sm:order-3">
          <Link
            href="/login"
            className="rounded-full px-3 py-2 font-semibold text-emerald-950"
          >
            {copy.signIn}
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-emerald-950 px-4 py-2 font-semibold text-white"
          >
            {copy.register}
          </Link>
        </div>
      </div>
    </header>
  );
}
