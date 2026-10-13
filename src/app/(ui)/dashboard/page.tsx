import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";
import { DASHBOARD_BY_ROLE } from "@/lib/navigation";
import { routePath } from "@/lib/i18n/config";
import { getLocaleContext } from "@/lib/i18n/server";

export default async function DashboardPage() {
  const [user, { locale, localizedRoute }] = await Promise.all([
    requireAuth("/dashboard"),
    getLocaleContext(),
  ]);
  redirect(routePath(DASHBOARD_BY_ROLE[user.role], locale, localizedRoute));
}
