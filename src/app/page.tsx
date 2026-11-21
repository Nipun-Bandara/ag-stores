import { redirect } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { routePath } from "@/lib/i18n/config";
import { getLocaleContext } from "@/lib/i18n/server";

/** Signed-in customers start at the store Home; everyone else signs in. */
export default async function RootPage() {
  const [{ locale, localizedRoute }, user] = await Promise.all([
    getLocaleContext(),
    getAuthenticatedUser(),
  ]);
  redirect(
    routePath(
      user?.role === UserRole.CUSTOMER ? "/home" : "/auth",
      locale,
      localizedRoute,
    ),
  );
}
