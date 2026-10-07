import { cookies, headers } from "next/headers";

import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE_NAME,
  LOCALE_HEADER_NAME,
  LOCALE_ROUTE_HEADER_NAME,
  type Locale,
} from "@/lib/i18n/config";

export async function getCurrentLocale(): Promise<Locale> {
  const requestLocale = (await headers()).get(LOCALE_HEADER_NAME);
  if (isLocale(requestLocale)) return requestLocale;
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE_NAME)?.value;
  return isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
}

export interface LocaleContext {
  locale: Locale;
  localizedRoute: boolean;
}

export async function getLocaleContext(): Promise<LocaleContext> {
  const requestHeaders = await headers();
  const requestLocale = requestHeaders.get(LOCALE_HEADER_NAME);
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE_NAME)?.value;

  return {
    locale: isLocale(requestLocale)
      ? requestLocale
      : isLocale(cookieLocale)
        ? cookieLocale
        : DEFAULT_LOCALE,
    localizedRoute: requestHeaders.get(LOCALE_ROUTE_HEADER_NAME) === "1",
  };
}
