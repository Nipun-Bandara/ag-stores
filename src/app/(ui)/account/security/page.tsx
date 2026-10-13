import type { Metadata } from "next";

import { UserRole } from "@/generated/prisma/client";
import { PasswordForm } from "@/features/account/components/password-form";
import { requireRole } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Security | AG Stores" };

export default async function SecurityPage() {
  await requireRole(UserRole.CUSTOMER, "/account/security");

  return (
    <section className="min-w-0 w-full">
      <h1 className="text-3xl font-semibold tracking-tight">Security</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Changing your password requires your current password and signs out
        other sessions.
      </p>
      <PasswordForm />
    </section>
  );
}
