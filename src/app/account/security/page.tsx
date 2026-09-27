import type { Metadata } from "next";

import { UserRole } from "@/generated/prisma/client";
import { AccountHeader } from "@/features/account/components/account-header";
import { PasswordForm } from "@/features/account/components/password-form";
import { requireRole } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Security | AG Stores" };

export default async function SecurityPage() {
  await requireRole([UserRole.CUSTOMER]);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <AccountHeader />
      <section className="pt-8">
        <h1 className="text-3xl font-semibold tracking-tight">Security</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Changing your password requires your current password and signs out
          other sessions.
        </p>
        <PasswordForm />
      </section>
    </main>
  );
}
