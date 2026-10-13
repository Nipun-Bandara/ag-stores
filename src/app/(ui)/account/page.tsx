import type { Metadata } from "next";

import Link from "next/link";

import { UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/server";
import { getDictionary, routePath } from "@/lib/i18n/config";
import { getLocaleContext } from "@/lib/i18n/server";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Account | AG Stores" };

export default async function AccountPage() {
  const [user, localeContext] = await Promise.all([
    requireRole(UserRole.CUSTOMER, "/account"),
    getLocaleContext(),
  ]);
  const { locale, localizedRoute } = localeContext;
  const copy = getDictionary(locale);
  const href = (path: string) => routePath(path, locale, localizedRoute);

  return (
    <section className="min-w-0 w-full">
      <Card as="section" className="gap-0 p-4 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {copy.account.yourAccount}
        </h1>
        <h2 className="text-xl font-semibold">{user.name}</h2>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">{copy.account.contact}</dt>
            <dd className="mt-1 font-medium">{user.email ?? user.phone}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {copy.account.accountType}
            </dt>
            <dd className="mt-1 font-medium">
              {user.role.replaceAll("_", " ")}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {copy.account.preferredLanguage}
            </dt>
            <dd className="mt-1 font-medium">
              {user.preferredLanguage === "SI" ? "සිංහල" : "English"}
            </dd>
          </div>
        </dl>
        <div className="mt-6 flex gap-3 border-t pt-5 text-sm font-medium">
          <Link className="underline" href={href("/account/profile")}>
            {copy.account.editProfile}
          </Link>
          <Link className="underline" href={href("/account/addresses")}>
            {copy.account.deliveryAddresses}
          </Link>
          <Link className="underline" href={href("/account/security")}>
            {copy.account.changePassword}
          </Link>
        </div>
      </Card>
    </section>
  );
}
