import type { Metadata } from "next";

import { NotificationCenter } from "@/features/notifications/components/notification-center";
import { requireAuth } from "@/lib/auth/server";
import { getNotifications } from "@/services/notification.service";

export const metadata: Metadata = { title: "Notifications | AG Stores" };

export default async function NotificationsPage() {
  const user = await requireAuth("/notifications");
  const notifications = await getNotifications(user);

  return (
    <section className="min-w-0 w-full">
      <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Follow important updates for orders relevant to your account.
      </p>
      <NotificationCenter role={user.role} initialData={notifications} />
    </section>
  );
}
