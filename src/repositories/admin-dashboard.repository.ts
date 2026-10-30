import {
  OrderStatus,
  UserRole,
  UserStatus,
  type PrismaClient,
} from "@/generated/prisma/client";

export interface AdminDashboardSnapshot {
  ordersToday: number;
  deliveredToday: number;
  salesToday: string;
  users: Array<{ role: UserRole; status: UserStatus; count: number }>;
  shops: Array<{ isActive: boolean; isOpen: boolean; count: number }>;
  orders: Array<{ status: OrderStatus; count: number }>;
  dailyOrders: Array<{ date: string; orders: number }>;
  unassignedRiders: number;
}

export interface AdminDashboardRepository {
  snapshot(
    start: Date,
    end: Date,
    trendStart: Date,
  ): Promise<AdminDashboardSnapshot>;
}

export class PrismaAdminDashboardRepository implements AdminDashboardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async snapshot(
    start: Date,
    end: Date,
    trendStart: Date,
  ): Promise<AdminDashboardSnapshot> {
    const [
      ordersToday,
      delivered,
      users,
      shops,
      orders,
      dailyOrders,
      unassignedRiders,
    ] = await Promise.all([
      this.prisma.order.count({
        where: { createdAt: { gte: start, lt: end } },
      }),
      this.prisma.order.aggregate({
        where: {
          status: OrderStatus.DELIVERED,
          updatedAt: { gte: start, lt: end },
        },
        _count: { _all: true },
        _sum: { subtotal: true },
      }),
      this.prisma.user.groupBy({
        by: ["role", "status"],
        _count: { _all: true },
      }),
      this.prisma.shop.groupBy({
        by: ["isActive", "isOpen"],
        _count: { _all: true },
      }),
      this.prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.$queryRaw<Array<{ date: string; orders: number }>>`
        SELECT to_char("createdAt" AT TIME ZONE 'Asia/Colombo', 'YYYY-MM-DD') AS "date",
               COUNT(*)::integer AS "orders"
        FROM "orders"
        WHERE "createdAt" >= ${trendStart} AND "createdAt" < ${end}
        GROUP BY 1 ORDER BY 1
      `,
      this.prisma.user.count({
        where: {
          role: UserRole.DELIVERY_PERSON,
          status: UserStatus.ACTIVE,
          assignedShopId: null,
        },
      }),
    ]);

    return {
      ordersToday,
      deliveredToday: delivered._count._all,
      salesToday: delivered._sum.subtotal?.toFixed(2) ?? "0.00",
      users: users.map(({ role, status, _count }) => ({
        role,
        status,
        count: _count._all,
      })),
      shops: shops.map(({ isActive, isOpen, _count }) => ({
        isActive,
        isOpen,
        count: _count._all,
      })),
      orders: orders.map(({ status, _count }) => ({
        status,
        count: _count._all,
      })),
      dailyOrders,
      unassignedRiders,
    };
  }
}
