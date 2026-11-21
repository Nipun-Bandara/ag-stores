import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { AuthenticatedShell } from "@/features/auth/components/authenticated-shell";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { getLocaleContext } from "@/lib/i18n/server";

/**
 * Public storefront: visitors can browse products and build a cart without an
 * account. Signed-in customers get their usual sidebar; other roles keep their
 * own workspaces, as before. Checkout and account pages still require login.
 */
export default async function StorefrontLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [localeContext, user] = await Promise.all([
    getLocaleContext(),
    getAuthenticatedUser(),
  ]);
  if (user && user.role !== UserRole.CUSTOMER) redirect("/forbidden");

  return (
    <AuthenticatedShell {...localeContext} allowGuests>
      {children}
    </AuthenticatedShell>
  );
}
