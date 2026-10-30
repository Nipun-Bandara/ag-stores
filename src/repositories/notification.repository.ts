import { Prisma, type PrismaClient } from "@/generated/prisma/client";

const notificationSelect = {
  id: true,
  orderId: true,
  type: true,
  title: true,
  message: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

export type NotificationRecord = Prisma.NotificationGetPayload<{
  select: typeof notificationSelect;
}>;

export interface NotificationRepository {
  findManyForUser(userId: string): Promise<NotificationRecord[]>;
  countUnread(userId: string): Promise<number>;
  markRead(
    userId: string,
    notificationId: string,
  ): Promise<NotificationRecord | null>;
  markAllRead(userId: string, readAt: Date): Promise<number>;
}

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findManyForUser(userId: string): Promise<NotificationRecord[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
      select: notificationSelect,
    });
  }

  countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  markRead(
    userId: string,
    notificationId: string,
  ): Promise<NotificationRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const owned = await transaction.notification.findFirst({
        where: { id: notificationId, userId },
        select: { id: true, readAt: true },
      });
      if (!owned) return null;
      if (!owned.readAt) {
        await transaction.notification.update({
          where: { id: owned.id },
          data: { readAt: new Date() },
        });
      }
      return transaction.notification.findUnique({
        where: { id: owned.id },
        select: notificationSelect,
      });
    });
  }

  async markAllRead(userId: string, readAt: Date): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt },
    });
    return result.count;
  }
}
