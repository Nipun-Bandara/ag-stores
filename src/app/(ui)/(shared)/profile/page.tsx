import { WorkspaceProfile } from "@/features/account/components/workspace-profile";
import { requireAuth } from "@/lib/auth/server";
import { getCustomerProfile } from "@/services/customer-profile.service";
export default async function ProfilePage() {
  const session = await requireAuth("/profile");
  return <WorkspaceProfile user={await getCustomerProfile(session)} />;
}
