import type { UserRole } from "@/generated/prisma/client";
import { RoleAwareNavigation } from "@/features/auth/components/role-aware-navigation";
import { requireRole } from "@/lib/auth/server";

interface RoleDashboardPlaceholderProps {
  role: UserRole;
  path: string;
  title: string;
  description: string;
}

export async function RoleDashboardPlaceholder({
  role,
  path,
  title,
  description,
}: RoleDashboardPlaceholderProps) {
  const user = await requireRole(role, path);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-16">
      <RoleAwareNavigation user={user} />
      <section className="mt-8 rounded-xl border p-8">
        <p className="text-sm font-medium text-neutral-500">{user.name}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 max-w-2xl text-neutral-600">{description}</p>
      </section>
    </main>
  );
}
