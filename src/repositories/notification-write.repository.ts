import type { Prisma } from "@/generated/prisma/client";
import type { NotificationCreateRecord } from "@/services/order-notification.service";

export async function createNotifications(
  prisma: Prisma.TransactionClient,
  notifications: readonly NotificationCreateRecord[],
): Promise<void> {
  if (notifications.length === 0) return;
  await prisma.notification.createMany({
    data: [...notifications],
    skipDuplicates: true,
  });
}
