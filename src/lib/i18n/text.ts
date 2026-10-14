import en from "@/lib/i18n/dictionaries/en.json";
import si from "@/lib/i18n/dictionaries/si.json";
import ui from "@/lib/i18n/dictionaries/ui-si.json";
import type { Locale } from "@/lib/i18n/config";

function collectTranslations(
  english: Record<string, unknown>,
  sinhala: Record<string, unknown>,
  result: Record<string, string>,
) {
  for (const [key, value] of Object.entries(english)) {
    const translated = sinhala[key];
    if (typeof value === "string" && typeof translated === "string") {
      result[value] = translated;
    } else if (
      value &&
      translated &&
      typeof value === "object" &&
      typeof translated === "object"
    ) {
      collectTranslations(
        value as Record<string, unknown>,
        translated as Record<string, unknown>,
        result,
      );
    }
  }
}

const translations: Record<string, string> = { ...ui };
collectTranslations(en, si, translations);

/** Translate fixed interface copy. Product names and other user data are handled separately. */
export function translate(
  locale: Locale,
  english: string,
  params?: Record<string, string | number>,
): string {
  const normalized = english.trim();
  const translated =
    locale === "si"
      ? (translations[english] ?? translations[normalized])
      : undefined;
  if (locale === "si" && !translated) {
    const stock = /^(.+) only has (\d+) available\.$/.exec(normalized);
    if (stock) {
      return translate(locale, "{name} only has {count} available.", {
        name: stock[1] ?? "",
        count: stock[2] ?? "",
      });
    }
  }
  const result = translated
    ? `${english.slice(0, english.indexOf(normalized))}${translated}${english.slice(english.indexOf(normalized) + normalized.length)}`
    : english;
  return params
    ? result.replace(/\{([a-zA-Z]+)\}/g, (match, key: string) =>
        key in params ? String(params[key]) : match,
      )
    : result;
}

export function formatLocaleDate(
  locale: Locale,
  value: Date | string,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  },
) {
  return new Intl.DateTimeFormat(locale === "si" ? "si-LK" : "en-LK", {
    timeZone: "Asia/Colombo",
    ...options,
  }).format(new Date(value));
}

export function translateOrderNotification(
  locale: Locale,
  message: string,
  orderId: string,
): string {
  const reference = orderId.slice(0, 8).toUpperCase();
  return translate(locale, message.replaceAll(reference, "{order}"), {
    order: reference,
  });
}
