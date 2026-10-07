import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";
import { getDictionary } from "@/lib/i18n/config";
import { getLocaleContext } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Register | AG Stores" };

export default async function RegisterPage() {
  const { locale, localizedRoute } = await getLocaleContext();
  const copy = getDictionary(locale).auth;
  return (
    <AuthShell
      title={copy.createAccount}
      description={copy.registerDescription}
      alternateText={copy.alreadyRegistered}
      alternateHref="/login"
      alternateLabel={copy.signIn}
      locale={locale}
      localizedRoute={localizedRoute}
    >
      <RegisterForm locale={locale} localizedRoute={localizedRoute} />
    </AuthShell>
  );
}
