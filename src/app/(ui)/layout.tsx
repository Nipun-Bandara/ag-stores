import type { ReactNode } from "react";

import { AuthenticatedShell } from "@/features/auth/components/authenticated-shell";
import { requireAuth } from "@/lib/auth/server";
import { getLocaleContext } from "@/lib/i18n/server";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [localeContext] = await Promise.all([
    getLocaleContext(),
    requireAuth("/dashboard"),
  ]);
  return <AuthenticatedShell {...localeContext}>{children}</AuthenticatedShell>;
}
