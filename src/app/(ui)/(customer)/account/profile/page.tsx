import { getServerText } from "@/lib/i18n/server";
import { Text } from "@/features/i18n/components/text";
import type { Metadata } from "next";

import { UserRole } from "@/generated/prisma/client";
import { ProfileForm } from "@/features/account/components/profile-form";
import { requireRole } from "@/lib/auth/server";
import { getCustomerProfile } from "@/services/customer-profile.service";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Profile")} | AG Stores` };
}

export default async function ProfilePage() {
  const sessionUser = await requireRole(UserRole.CUSTOMER, "/account/profile");
  const user = await getCustomerProfile(sessionUser);

  return (
    <section className="min-w-0 w-full">
      <h1 className="text-3xl font-semibold tracking-tight">
        <Text value={"Profile"} />
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <Text
          value={
            "Manage your customer name, phone number, and preferred language. "
          }
        />
      </p>
      <ProfileForm user={user} />
    </section>
  );
}
