import { describe, expect, it, vi } from "vitest";

import {
  NotificationType,
  PreferredLanguage,
  UserRole,
  UserStatus,
} from "@/generated/prisma/client";
import type { NotificationRepository } from "@/repositories/notification.repository";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notification.service";
import type { AuthenticatedUser } from "@/types/auth";

const user: AuthenticatedUser = {
  id: "9965b2c6-6da9-49fd-9b52-655158116faf",
  name: "Customer",
  email: "customer@example.test",
  phone: null,
  role: UserRole.CUSTOMER,
  preferredLanguage: PreferredLanguage.EN,
  status: UserStatus.ACTIVE,
};

const notification = {
  id: "0df97752-aaaf-4c2a-beac-d42122853f75",
  orderId: "87d9a0e2-8e03-4c30-8377-fb41062017f2",
  type: NotificationType.ORDER_CONFIRMED,
  title: "Order confirmed",
  message: "Your order has been confirmed.",
  readAt: null,
  createdAt: new Date("2026-10-08T10:00:00.000Z"),
};

function repository(): NotificationRepository {
  return {
    findManyForUser: vi.fn().mockResolvedValue([notification]),
    countUnread: vi.fn().mockResolvedValue(1),
    markRead: vi.fn().mockResolvedValue({
      ...notification,
      readAt: new Date("2026-10-08T10:05:00.000Z"),
    }),
    markAllRead: vi.fn().mockResolvedValue(1),
  };
}

describe("notification service", () => {
  it("returns only the authenticated user's records and unread count", async () => {
    const notifications = repository();
    await expect(getNotifications(user, notifications)).resolves.toMatchObject({
      unreadCount: 1,
      notifications: [{ id: notification.id, readAt: null }],
    });
    expect(notifications.findManyForUser).toHaveBeenCalledWith(user.id);
    expect(notifications.countUnread).toHaveBeenCalledWith(user.id);
  });

  it("marks one owned notification as read", async () => {
    const notifications = repository();
    await expect(
      markNotificationRead(user, notification.id, notifications),
    ).resolves.toMatchObject({
      id: notification.id,
      readAt: "2026-10-08T10:05:00.000Z",
    });
    expect(notifications.markRead).toHaveBeenCalledWith(
      user.id,
      notification.id,
    );
  });

  it("does not expose a notification that is not owned by the user", async () => {
    const notifications = repository();
    vi.mocked(notifications.markRead).mockResolvedValue(null);
    await expect(
      markNotificationRead(user, notification.id, notifications),
    ).rejects.toMatchObject({ code: "NOTIFICATION_NOT_FOUND", status: 404 });
  });

  it("marks all of the authenticated user's unread records", async () => {
    const notifications = repository();
    await expect(
      markAllNotificationsRead(user, notifications),
    ).resolves.toMatchObject({ updatedCount: 1, readAt: expect.any(String) });
    expect(notifications.markAllRead).toHaveBeenCalledWith(
      user.id,
      expect.any(Date),
    );
  });
});
