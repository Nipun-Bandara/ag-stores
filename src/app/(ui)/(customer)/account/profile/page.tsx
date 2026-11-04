import { UserRole } from "@/generated/prisma/client";
import { WorkspaceProfile } from "@/features/account/components/workspace-profile";
import { requireRole } from "@/lib/auth/server";
import { getCustomerProfile } from "@/services/customer-profile.service";
export default async function ProfilePage() {
  const session = await requireRole(UserRole.CUSTOMER, "/account/profile");
  return <WorkspaceProfile user={await getCustomerProfile(session)} />;
}
