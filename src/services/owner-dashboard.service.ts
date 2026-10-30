import { getDb } from "@/db";
import { OrderStatus, UserRole } from "@/generated/prisma/client";
import {
  PrismaOwnerDashboardRepository,
  type OwnerDashboardRepository,
} from "@/repositories/owner-dashboard.repository";
import type { AuthenticatedUser } from "@/types/auth";

const COLOMBO_OFFSET_MILLISECONDS = 5.5 * 60 * 60 * 1000;

export class OwnerDashboardError extends Error {
  readonly code = "OWNER_ONLY";
  readonly status = 403;

  constructor() {
    super("Shop owner access is required.");
    this.name = "OwnerDashboardError";
  }
}

function repository(): OwnerDashboardRepository {
  return new PrismaOwnerDashboardRepository(getDb());
}

export function getColomboDayRange(now: Date): {
  start: Date;
  end: Date;
} {
  const localTime = new Date(now.getTime() + COLOMBO_OFFSET_MILLISECONDS);
  const localMidnightAsUtc = Date.UTC(
    localTime.getUTCFullYear(),
    localTime.getUTCMonth(),
    localTime.getUTCDate(),
  );
  const start = new Date(localMidnightAsUtc - COLOMBO_OFFSET_MILLISECONDS);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export async function getOwnerDashboard(
  user: AuthenticatedUser,
  dashboardRepository: OwnerDashboardRepository = repository(),
  now = new Date(),
) {
  if (user.role !== UserRole.SHOP_OWNER) {
    throw new OwnerDashboardError();
  }

  const { start, end } = getColomboDayRange(now);
  const aggregate = await dashboardRepository.aggregateOwned(
    user.id,
    start,
    end,
  );
  const counts = new Map(
    aggregate.statusCounts.map(({ status, count }) => [status, count]),
  );

  return {
    ordersToday: aggregate.ordersToday,
    pendingOrders:
      (counts.get(OrderStatus.PLACED) ?? 0) +
      (counts.get(OrderStatus.CONFIRMED) ?? 0),
    preparingOrders: counts.get(OrderStatus.PREPARING) ?? 0,
    readyForDelivery: counts.get(OrderStatus.READY_FOR_DELIVERY) ?? 0,
    outForDelivery: counts.get(OrderStatus.OUT_FOR_DELIVERY) ?? 0,
    deliveredToday: aggregate.deliveredToday,
    revenueToday: aggregate.revenueToday,
    lowStockProducts: aggregate.lowStockProducts,
  };
}
