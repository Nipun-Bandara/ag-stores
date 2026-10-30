import { getServerText } from "@/lib/i18n/server";
import type { Metadata } from "next";

import AuthContainer from "@/features/auth/components/AuthContainer";
import { safeAuthReturnTo } from "@/features/auth/return-to";
import { routePath } from "@/lib/i18n/config";
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
  const [query, { locale, localizedRoute }] = await Promise.all([
    searchParams,
    getLocaleContext(),
  ]);

  return (
    <AuthContainer
      key={query.mode === "register" ? "register" : "login"}
      initialMode={query.mode === "register" ? "register" : "login"}
      homeHref={routePath("/", locale, localizedRoute)}
      returnTo={
        safeAuthReturnTo(query.returnTo) ??
        routePath("/dashboard", locale, localizedRoute)
      }
    />
  );
}
