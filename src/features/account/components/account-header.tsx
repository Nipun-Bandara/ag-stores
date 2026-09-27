import { RoleAwareNavigation } from "@/features/auth/components/role-aware-navigation";
import type { AuthenticatedUser } from "@/types/auth";

export function AccountHeader({ user }: { user: AuthenticatedUser }) {
  return <RoleAwareNavigation user={user} />;
}
