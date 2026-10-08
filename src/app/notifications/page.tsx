import type { Metadata } from "next";

import { RoleAwareNavigation } from "@/features/auth/components/role-aware-navigation";
import { NotificationCenter } from "@/features/notifications/components/notification-center";
import { requireAuth } from "@/lib/auth/server";
import { getNotifications } from "@/services/notification.service";

export const metadata: Metadata = { title: "Notifications | AG Stores" };

export default async function NotificationsPage() {
  const user = await requireAuth("/notifications");
  const notifications = await getNotifications(user);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
      <RoleAwareNavigation user={user} />
      <section className="pt-8">
        <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Follow important updates for orders relevant to your account.
        </p>
        <NotificationCenter role={user.role} initialData={notifications} />
      </section>
    </main>
  );
}
