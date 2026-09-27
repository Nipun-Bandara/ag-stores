import { UserRole } from "@/generated/prisma/client";
import { RoleDashboardPlaceholder } from "@/features/dashboard/components/role-dashboard-placeholder";

export default function OwnerDashboardPage() {
  return (
    <RoleDashboardPlaceholder
      role={UserRole.SHOP_OWNER}
      path="/owner"
      title="Shop owner dashboard"
      description="Shop and catalog management tools will be added here."
    />
  );
}
