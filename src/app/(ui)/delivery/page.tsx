import { UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/server";
import { getLocaleContext } from "@/lib/i18n/server";
import { RoleDashboard } from "@/features/dashboard/components/role-dashboard";

export default async function DeliveryDashboardPage() {
  const [localeContext] = await Promise.all([
    getLocaleContext(),
    requireRole(UserRole.DELIVERY_PERSON, "/delivery"),
  ]);
  return <RoleDashboard {...localeContext} />;
}
