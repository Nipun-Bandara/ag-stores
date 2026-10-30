import { getDb } from "@/db";
import {
  PrismaNotificationRepository,
  type NotificationRecord,
  type NotificationRepository,
} from "@/repositories/notification.repository";
import type { AuthenticatedUser } from "@/types/auth";

export class NotificationError extends Error {
  constructor(
    readonly code: "NOTIFICATION_NOT_FOUND",
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "NotificationError";
  }
}

function repository(): NotificationRepository {
  return new PrismaNotificationRepository(getDb());
}

function toView(notification: NotificationRecord) {
  return {
    id: notification.id,
    orderId: notification.orderId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
  };
}

export async function getNotifications(
  user: AuthenticatedUser,
  notifications: NotificationRepository = repository(),
) {
  const [records, unreadCount] = await Promise.all([
    notifications.findManyForUser(user.id),
    notifications.countUnread(user.id),
  ]);
  return { notifications: records.map(toView), unreadCount };
}

export function getUnreadNotificationCount(
  user: AuthenticatedUser,
  notifications: NotificationRepository = repository(),
) {
  return notifications.countUnread(user.id);
}

export async function markNotificationRead(
  user: AuthenticatedUser,
  notificationId: string,
  notifications: NotificationRepository = repository(),
) {
  const notification = await notifications.markRead(user.id, notificationId);
  if (!notification) {
    throw new NotificationError(
      "NOTIFICATION_NOT_FOUND",
      "Notification not found.",
      404,
    );
  }
  return toView(notification);
}

export async function markAllNotificationsRead(
  user: AuthenticatedUser,
  notifications: NotificationRepository = repository(),
) {
  const readAt = new Date();
  const updatedCount = await notifications.markAllRead(user.id, readAt);
  return { updatedCount, readAt: readAt.toISOString() };
}

export type NotificationCenterView = Awaited<
  ReturnType<typeof getNotifications>
>;
