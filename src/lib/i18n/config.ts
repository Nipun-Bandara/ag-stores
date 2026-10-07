import en from "@/lib/i18n/dictionaries/en.json";
import si from "@/lib/i18n/dictionaries/si.json";

export const locales = ["en", "si"] as const;
export type Locale = (typeof locales)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE_NAME = "ag_stores_locale";
export const LOCALE_HEADER_NAME = "x-ag-stores-locale";
export const LOCALE_ROUTE_HEADER_NAME = "x-ag-stores-localized-route";

type DictionaryShape<T> = {
  [Key in keyof T]: T[Key] extends string ? string : DictionaryShape<T[Key]>;
};

export type Dictionary = DictionaryShape<typeof en>;

const dictionaries: Record<Locale, Dictionary> = { en, si };

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "si";
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function localeFromPreference(preference: "EN" | "SI"): Locale {
  return preference === "SI" ? "si" : "en";
}

export function preferenceFromLocale(locale: Locale): "EN" | "SI" {
  return locale === "si" ? "SI" : "EN";
}

export function localizeBilingual(
  english: string,
  sinhala: string | null,
  locale: Locale,
): string {
  const normalizedSinhala = sinhala?.trim();
  return locale === "si" && normalizedSinhala ? normalizedSinhala : english;
}

export function localizedPath(path: string, locale: Locale): string {
  if (path.startsWith("/api/") || /^(?:https?:|mailto:|tel:)/.test(path)) {
    return path;
  }
  if (path.startsWith("#")) return `/${locale}${path}`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const withoutLocale = normalized.replace(/^\/(?:en|si)(?=\/|$)/, "") || "/";
  return `/${locale}${withoutLocale === "/" ? "" : withoutLocale}`;
}

export function routePath(
  path: string,
  locale: Locale,
  localizedRoute: boolean,
): string {
  return localizedRoute ? localizedPath(path, locale) : path;
}
