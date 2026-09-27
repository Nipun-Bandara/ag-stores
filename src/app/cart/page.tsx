import { UserRole } from "@/generated/prisma/client";
import { RoleDashboardPlaceholder } from "@/features/dashboard/components/role-dashboard-placeholder";

export default function CartPage() {
  return (
    <RoleDashboardPlaceholder
      role={UserRole.CUSTOMER}
      path="/cart"
      title="Your cart"
      description="Customer cart functionality will be added here."
    />
  );
}
