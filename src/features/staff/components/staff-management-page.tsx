import { getOrderStaff } from "@/services/order-staff.service";
import { getServerText } from "@/lib/i18n/server";
import { StaffManager } from "./staff-manager";
import type { AuthenticatedUser } from "@/types/auth";
export async function StaffManagementPage({
  user,
}: {
  user: AuthenticatedUser;
}) {
  const [data, t] = await Promise.all([getOrderStaff(user), getServerText()]);
  return (
    <section className="w-full min-w-0">
      <h1 className="text-3xl font-semibold tracking-tight">
        {t("Order staff")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t(
          "Give each order handler their own account with access to their assigned shop.",
        )}
      </p>
      <StaffManager data={data} />
    </section>
  );
}
