import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE_NAME,
  LOCALE_HEADER_NAME,
  LOCALE_ROUTE_HEADER_NAME,
} from "@/lib/i18n/config";

const protectedRoots = [
  "/account",
  "/orders",
  "/cart",
  "/checkout",
  "/owner",
  "/delivery",
  "/admin",
];

function isProtectedPath(pathname: string): boolean {
  return protectedRoots.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`),
  );
}

export function proxy(request: NextRequest) {
  const segments = request.nextUrl.pathname.split("/");
  const routeLocale = isLocale(segments[1]) ? segments[1] : null;
  const pathname = routeLocale
    ? `/${segments.slice(2).join("/")}`.replace(/\/$/, "") || "/"
    : request.nextUrl.pathname;
  const localeCookie = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  const forwardedLocale = request.headers.get(LOCALE_HEADER_NAME);
  const locale =
    routeLocale ??
    (isLocale(forwardedLocale) ? forwardedLocale : null) ??
    (isLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE);

  if (isProtectedPath(pathname) && !request.cookies.has(SESSION_COOKIE_NAME)) {
    const loginUrl = new URL(
      routeLocale ? `/${routeLocale}/login` : "/login",
      request.url,
    );
    loginUrl.searchParams.set("returnTo", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER_NAME, locale);
  if (routeLocale) requestHeaders.set(LOCALE_ROUTE_HEADER_NAME, "1");

  if (routeLocale) {
    const destination = request.nextUrl.clone();
    destination.pathname = pathname;
    const response = NextResponse.rewrite(destination, {
      request: { headers: requestHeaders },
    });
    if (localeCookie !== routeLocale) {
      response.cookies.set(LOCALE_COOKIE_NAME, routeLocale, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return response;
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
