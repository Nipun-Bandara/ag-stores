"use client";

import { useAuth } from "@/context/AuthContext";
import { isRole, ROLE_LABELS } from "@/lib/navigation";
import { Card } from "@/components/ui/card";

export function WorkspaceProfile() {
  const { user } = useAuth();
  if (!user || !isRole(user.role)) return null;
  return (
    <Card
      as="section"
      className="min-w-0 w-full max-w-2xl gap-0 bg-card p-4 sm:p-6"
    >
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
    </Card>
  );
}
