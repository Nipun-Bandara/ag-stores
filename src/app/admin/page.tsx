import { UserRole } from "@/generated/prisma/client";
import { RoleDashboardPlaceholder } from "@/features/dashboard/components/role-dashboard-placeholder";

export default function AdminDashboardPage() {
  return (
    <RoleDashboardPlaceholder
      role={UserRole.ADMIN}
      path="/admin"
      title="Administration dashboard"
      description="Platform administration and account provisioning tools will be added here."
    />
  );
}
