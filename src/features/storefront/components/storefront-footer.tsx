import { getDictionary, type Locale } from "@/lib/i18n/config";

export function StorefrontFooter({ locale = "en" }: { locale?: Locale }) {
  const dictionary = getDictionary(locale);
  return (
    <footer className="mt-20 border-t border-emerald-950/10 bg-emerald-950 py-10 text-emerald-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="font-bold">{dictionary.common.brand}</p>
        <p className="mt-2 max-w-md text-sm text-emerald-100/75">
          {dictionary.storefront.footerDescription}
        </p>
      </div>
    </footer>
  );
}
