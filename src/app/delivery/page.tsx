import { UserRole } from "@/generated/prisma/client";
import { RoleDashboardPlaceholder } from "@/features/dashboard/components/role-dashboard-placeholder";

export default function DeliveryDashboardPage() {
  return (
    <RoleDashboardPlaceholder
      role={UserRole.DELIVERY_PERSON}
      path="/delivery"
      title="Delivery dashboard"
      description="Assigned delivery batches and route tools will be added here."
    />
  );
}
