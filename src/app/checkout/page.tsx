import { UserRole } from "@/generated/prisma/client";
import { RoleDashboardPlaceholder } from "@/features/dashboard/components/role-dashboard-placeholder";

export default function CheckoutPage() {
  return (
    <RoleDashboardPlaceholder
      role={UserRole.CUSTOMER}
      path="/checkout"
      title="Checkout"
      description="Customer checkout functionality will be added here."
    />
  );
}
