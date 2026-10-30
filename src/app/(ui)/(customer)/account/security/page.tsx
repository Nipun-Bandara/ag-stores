import { getServerText } from "@/lib/i18n/server";
import { Text } from "@/features/i18n/components/text";
import type { Metadata } from "next";

import { UserRole } from "@/generated/prisma/client";
import { PasswordForm } from "@/features/account/components/password-form";
import { requireRole } from "@/lib/auth/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Security")} | AG Stores` };
}

export default async function SecurityPage() {
  await requireRole(UserRole.CUSTOMER, "/account/security");

  return (
    <section className="min-w-0 w-full">
      <h1 className="text-3xl font-semibold tracking-tight">
        <Text value={"Security"} />
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <Text
          value={
            "Changing your password requires your current password and signs out other sessions. "
          }
        />
      </p>
      <PasswordForm />
    </section>
  );
}
