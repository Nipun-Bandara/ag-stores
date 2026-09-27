import type { Metadata } from "next";

import { UserRole } from "@/generated/prisma/client";
import { AccountHeader } from "@/features/account/components/account-header";
import { ProfileForm } from "@/features/account/components/profile-form";
import { requireRole } from "@/lib/auth/server";
import { getCustomerProfile } from "@/services/customer-profile.service";

export const metadata: Metadata = { title: "Profile | AG Stores" };

export default async function ProfilePage() {
  const sessionUser = await requireRole(UserRole.CUSTOMER, "/account/profile");
  const user = await getCustomerProfile(sessionUser);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <AccountHeader user={user} />
      <section className="pt-8">
        <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Manage your customer name, phone number, and preferred language.
        </p>
        <ProfileForm user={user} />
      </section>
    </main>
  );
}
