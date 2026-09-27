import { UserRole } from "@/generated/prisma/client";
import { RoleDashboardPlaceholder } from "@/features/dashboard/components/role-dashboard-placeholder";

export default function OrdersPage() {
  return (
    <RoleDashboardPlaceholder
      role={UserRole.CUSTOMER}
      path="/orders"
      title="Your orders"
      description="Customer order history and tracking will be added here."
    />
  );
}
