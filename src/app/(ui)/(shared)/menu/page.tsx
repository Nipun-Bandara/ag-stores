import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RoleMenu } from "@/features/account/components/mobile-account-menu";
import { Text } from "@/features/i18n/components/text";
import { requireAuth } from "@/lib/auth/server";
import { routePath } from "@/lib/i18n/config";
import { getLocaleContext, getServerText } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Menu")} | AG Stores` };
}

/**
 * Target of the More/Account tab for staff roles on phones: every page the
 * bottom tabs leave out, plus sign-out. Customers keep this list on /account.
 */
export default async function RoleMenuPage() {
  const [user, { locale, localizedRoute }] = await Promise.all([
    requireAuth("/menu"),
    getLocaleContext(),
  ]);
  if (user.role === "CUSTOMER") {
    redirect(routePath("/account", locale, localizedRoute));
  }

  return (
    <section className="min-w-0 w-full max-w-xl">
      <h1 className="text-3xl font-semibold tracking-tight">
        <Text value="Menu" />
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{user.name}</p>
      <RoleMenu
        role={user.role}
        locale={locale}
        localizedRoute={localizedRoute}
        className="mt-6"
      />
    </section>
  );
}
