import type { NextResponse } from "next/server";

import { LOCALE_COOKIE_NAME, type Locale } from "@/lib/i18n/config";

export function setLocaleCookie(response: NextResponse, locale: Locale): void {
  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
