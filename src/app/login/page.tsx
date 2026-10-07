import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import { getDictionary } from "@/lib/i18n/config";
import { getLocaleContext } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Sign in | AG Stores" };

interface LoginPageProps {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [query, localeContext] = await Promise.all([
    searchParams,
    getLocaleContext(),
  ]);
  const requestedPath = query.returnTo;
  const returnTo =
    typeof requestedPath === "string" &&
    requestedPath.startsWith("/") &&
    !requestedPath.startsWith("//")
      ? requestedPath
      : undefined;
  const { locale, localizedRoute } = localeContext;
  const copy = getDictionary(locale).auth;

  return (
    <AuthShell
      title={copy.welcomeBack}
      description={copy.loginDescription}
      alternateText={copy.newCustomer}
      alternateHref="/register"
      alternateLabel={copy.createAccountLink}
      locale={locale}
      localizedRoute={localizedRoute}
    >
      <LoginForm
        locale={locale}
        localizedRoute={localizedRoute}
        {...(returnTo ? { returnTo } : {})}
      />
    </AuthShell>
  );
}
