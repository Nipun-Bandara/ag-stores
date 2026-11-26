import { getServerText } from "@/lib/i18n/server";
import type { Metadata } from "next";

import AuthContainer from "@/features/auth/components/AuthContainer";
import { safeAuthReturnTo } from "@/features/auth/return-to";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth/server";
import { routePath } from "@/lib/i18n/config";
import {
  canAccessWorkspace,
  DASHBOARD_BY_ROLE,
  navigationPath,
} from "@/lib/navigation";
import { getLocaleContext } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Sign in or register")} | AG Stores` };
}

interface AuthPageProps {
  searchParams: Promise<{
    mode?: string | string[];
    returnTo?: string | string[];
  }>;
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const [query, { locale, localizedRoute }, user] = await Promise.all([
    searchParams,
    getLocaleContext(),
    getAuthenticatedUser(),
  ]);

  // Already signed in: go where a fresh login would (customers to Home,
  // owners and staff to their dashboard), or to an allowed return path.
  if (user) {
    const requested = safeAuthReturnTo(query.returnTo);
    const requestedPath = requested?.split("?")[0];
    redirect(
      requested &&
        requestedPath &&
        navigationPath(requestedPath) !== "/dashboard" &&
        canAccessWorkspace(user.role, requestedPath)
        ? requested
        : routePath(DASHBOARD_BY_ROLE[user.role], locale, localizedRoute),
    );
  }

  return (
    <AuthContainer
      key={query.mode === "register" ? "register" : "login"}
      initialMode={query.mode === "register" ? "register" : "login"}
      homeHref={routePath("/home", locale, localizedRoute)}
      returnTo={
        safeAuthReturnTo(query.returnTo) ??
        routePath("/dashboard", locale, localizedRoute)
      }
    />
  );
}
