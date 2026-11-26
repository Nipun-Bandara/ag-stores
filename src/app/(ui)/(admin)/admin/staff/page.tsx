import { requireRole } from "@/lib/auth/server";
import { StaffManagementPage } from "@/features/staff/components/staff-management-page";
export default async function Page() {
  return (
    <StaffManagementPage user={await requireRole("ADMIN", "/admin/staff")} />
  );
}
