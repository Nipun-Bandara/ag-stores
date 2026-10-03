import { getDb } from "@/db";
import { UserRole } from "@/generated/prisma/client";
import {
  PrismaAdminOrderRepository,
  type AdminOrderRepository,
} from "@/repositories/admin-order.repository";
import type { AuthenticatedUser } from "@/types/auth";

export async function listRecentOrderCancellations(
  user: AuthenticatedUser,
  orders: AdminOrderRepository = new PrismaAdminOrderRepository(getDb()),
) {
  if (user.role !== UserRole.ADMIN) {
    throw new Error("Administrator access is required.");
  }

  const cancellations = await orders.findRecentCancellations();
  return cancellations.map((order) => ({
    id: order.id,
    total: order.total.toFixed(2),
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    cancellationReason: order.cancellationReason,
    customer: order.customer,
    shopName: order.shop.name,
  }));
}
