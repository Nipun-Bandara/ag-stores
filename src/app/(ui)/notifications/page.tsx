import { getServerText } from "@/lib/i18n/server";
import { Text } from "@/features/i18n/components/text";
import type { Metadata } from "next";

import { NotificationCenter } from "@/features/notifications/components/notification-center";
import { requireAuth } from "@/lib/auth/server";
import { getNotifications } from "@/services/notification.service";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Notifications")} | AG Stores` };
}

export default async function NotificationsPage() {
  const user = await requireAuth("/notifications");
  const notifications = await getNotifications(user);

  return (
    <section className="min-w-0 w-full">
      <h1 className="text-3xl font-semibold tracking-tight">
        <Text value={"Notifications"} />
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <Text
          value={
            "Follow important updates for orders relevant to your account. "
          }
        />
      </p>
      <NotificationCenter role={user.role} initialData={notifications} />
    </section>
  );
}
