import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { AuthenticatedShell } from "@/features/auth/components/authenticated-shell";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { routePath } from "@/lib/i18n/config";
import { getLocaleContext } from "@/lib/i18n/server";
import { DASHBOARD_BY_ROLE } from "@/lib/navigation";

/**
 * Public storefront: visitors can browse products and build a cart without an
 * account. Signed-in customers get their usual sidebar. Owners and staff are
 * sent to their own workspace, where they manage products instead of shopping.
 * Checkout and account pages still require login.
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
  if (user && user.role !== UserRole.CUSTOMER) {
    redirect(
      routePath(
        DASHBOARD_BY_ROLE[user.role],
        localeContext.locale,
        localeContext.localizedRoute,
      ),
    );
  }

  return (
    <AuthenticatedShell {...localeContext} allowGuests>
      {children}
    </AuthenticatedShell>
  );
}
