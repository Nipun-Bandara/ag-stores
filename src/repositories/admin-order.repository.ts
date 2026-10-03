import {
  OrderStatus,
  Prisma,
  type PrismaClient,
} from "@/generated/prisma/client";

const cancelledOrderSelect = {
  id: true,
  total: true,
  cancelledAt: true,
  cancellationReason: true,
  customer: { select: { name: true, email: true, phone: true } },
  shop: { select: { name: true } },
} satisfies Prisma.OrderSelect;

export type CancelledOrderRecord = Prisma.OrderGetPayload<{
  select: typeof cancelledOrderSelect;
}>;

export interface AdminOrderRepository {
  findRecentCancellations(): Promise<CancelledOrderRecord[]>;
}

export class PrismaAdminOrderRepository implements AdminOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findRecentCancellations(): Promise<CancelledOrderRecord[]> {
    return this.prisma.order.findMany({
      where: { status: OrderStatus.CANCELLED, cancelledAt: { not: null } },
      orderBy: { cancelledAt: "desc" },
      take: 50,
      select: cancelledOrderSelect,
    });
  }
}
