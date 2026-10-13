"use client";

import { useAuth } from "@/context/AuthContext";
import { isRole, ROLE_LABELS } from "@/lib/navigation";

export function WorkspaceProfile() {
  const { user } = useAuth();
  if (!user || !isRole(user.role)) return null;
  return (
    <section className="max-w-2xl rounded-xl border bg-card p-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <dl className="mt-6 space-y-4">
        <div>
          <dt className="text-sm text-muted-foreground">Name</dt>
          <dd>{user.name}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Email</dt>
          <dd>{user.email ?? user.phone}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Role</dt>
          <dd>{ROLE_LABELS[user.role]}</dd>
        </div>
      </dl>
    </section>
  );
}
