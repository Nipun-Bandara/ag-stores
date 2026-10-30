import { getDb } from "@/db";
import { OrderStatus, UserRole, UserStatus } from "@/generated/prisma/client";
import { getColomboDayRange } from "@/services/owner-dashboard.service";
import {
  PrismaAdminDashboardRepository,
  type AdminDashboardRepository,
} from "@/repositories/admin-dashboard.repository";
import type { AuthenticatedUser } from "@/types/auth";

const DAY = 86_400_000;

export async function getAdminDashboard(
  user: AuthenticatedUser,
  repository: AdminDashboardRepository = new PrismaAdminDashboardRepository(
    getDb(),
  ),
  now = new Date(),
) {
  if (user.role !== UserRole.ADMIN)
    throw new Error("Administrator access is required.");
  const { start, end } = getColomboDayRange(now);
  const trendStart = new Date(start.getTime() - 6 * DAY);
  const data = await repository.snapshot(start, end, trendStart);
  const countOrders = (...statuses: OrderStatus[]) =>
    data.orders.reduce(
      (sum, item) => sum + (statuses.includes(item.status) ? item.count : 0),
      0,
    );
  const counts = new Map(
    data.dailyOrders.map((item) => [item.date, item.orders]),
  );
  const dailyOrders = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(trendStart.getTime() + index * DAY + 19_800_000)
      .toISOString()
      .slice(0, 10);
    return { date, orders: counts.get(date) ?? 0 };
  });

  return {
    ordersToday: data.ordersToday,
    deliveredToday: data.deliveredToday,
    salesToday: data.salesToday,
    totalUsers: data.users.reduce((sum, item) => sum + item.count, 0),
    restrictedUsers: data.users.reduce(
      (sum, item) => sum + (item.status !== UserStatus.ACTIVE ? item.count : 0),
      0,
    ),
    roles: Object.values(UserRole).map((role) => ({
      role,
      total: data.users
        .filter((item) => item.role === role)
        .reduce((sum, item) => sum + item.count, 0),
    })),
    totalShops: data.shops.reduce((sum, item) => sum + item.count, 0),
    openShops: data.shops
      .filter((item) => item.isActive && item.isOpen)
      .reduce((sum, item) => sum + item.count, 0),
    inactiveShops: data.shops
      .filter((item) => !item.isActive)
      .reduce((sum, item) => sum + item.count, 0),
    unassignedRiders: data.unassignedRiders,
    pipeline: [
      {
        label: "Awaiting confirmation",
        count: countOrders(OrderStatus.PLACED),
      },
      {
        label: "Confirmed and preparing",
        count: countOrders(OrderStatus.CONFIRMED, OrderStatus.PREPARING),
      },
      {
        label: "Ready for delivery",
        count: countOrders(OrderStatus.READY_FOR_DELIVERY),
      },
      { label: "Assigned", count: countOrders(OrderStatus.ASSIGNED) },
      {
        label: "Out for delivery",
        count: countOrders(OrderStatus.OUT_FOR_DELIVERY),
      },
    ],
    activeOrders: countOrders(
      OrderStatus.PLACED,
      OrderStatus.CONFIRMED,
      OrderStatus.PREPARING,
      OrderStatus.READY_FOR_DELIVERY,
      OrderStatus.ASSIGNED,
      OrderStatus.OUT_FOR_DELIVERY,
    ),
    dailyOrders,
    weekOrders: dailyOrders.reduce((sum, item) => sum + item.orders, 0),
  };
}
