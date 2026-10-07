import type { ReactNode } from "react";

import Link from "next/link";

import { LanguageSwitcher } from "@/features/i18n/components/language-switcher";
import { LocaleDocument } from "@/features/i18n/components/locale-document";
import { getDictionary, routePath, type Locale } from "@/lib/i18n/config";

interface AuthShellProps {
  title: string;
  description: string;
  alternateText: string;
  alternateHref: string;
  alternateLabel: string;
  locale: Locale;
  localizedRoute: boolean;
  children: ReactNode;
}

export function AuthShell({
  title,
  description,
  alternateText,
  alternateHref,
  alternateLabel,
  locale,
  localizedRoute,
  children,
}: AuthShellProps) {
  const common = getDictionary(locale).common;
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <LocaleDocument locale={locale} />
      <section className="w-full max-w-md rounded-xl border bg-white p-7 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={routePath("/", locale, localizedRoute)}
            className="text-sm font-semibold tracking-wide"
          >
            {common.brand}
          </Link>
          <LanguageSwitcher locale={locale} label={common.language} />
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-neutral-600">{description}</p>
        <div className="mt-7">{children}</div>
        <p className="mt-6 text-center text-sm text-neutral-600">
          {alternateText}{" "}
          <Link
            className="font-medium text-neutral-950 underline"
            href={routePath(alternateHref, locale, localizedRoute)}
          >
            {alternateLabel}
          </Link>
        </p>
      </section>
    </main>
  );
}
