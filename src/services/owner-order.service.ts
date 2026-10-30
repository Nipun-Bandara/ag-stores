import { getDb } from "@/db";
import { OrderStatus, UserRole } from "@/generated/prisma/client";
import {
  multiplyMinorUnits,
  moneyToMinorUnits,
  minorUnitsToMoney,
} from "@/lib/money";
import {
  PrismaOwnerOrderRepository,
  type OwnerOrderDetailRecord,
  type OwnerOrderFilters,
  type OwnerOrderListRecord,
  type OwnerOrderRepository,
} from "@/repositories/owner-order.repository";
import type { AuthenticatedUser } from "@/types/auth";
import type { OwnerOrderFiltersInput } from "@/validations/owner-order";

export class OwnerOrderError extends Error {
  constructor(
    readonly code: "OWNER_ONLY" | "ORDER_NOT_FOUND",
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "OwnerOrderError";
  }
}

const summaryGroups = [
  { key: "new", label: "Newly placed", statuses: [OrderStatus.PLACED] },
  { key: "confirmed", label: "Confirmed", statuses: [OrderStatus.CONFIRMED] },
  { key: "preparing", label: "Preparing", statuses: [OrderStatus.PREPARING] },
  {
    key: "ready",
    label: "Ready for delivery",
    statuses: [OrderStatus.READY_FOR_DELIVERY],
  },
  {
    key: "assigned",
    label: "Assigned",
    statuses: [OrderStatus.ASSIGNED, OrderStatus.OUT_FOR_DELIVERY],
  },
  {
    key: "completed",
    label: "Completed",
    statuses: [OrderStatus.DELIVERED, OrderStatus.FAILED_DELIVERY],
  },
  {
    key: "closed",
    label: "Rejected / cancelled",
    statuses: [OrderStatus.REJECTED, OrderStatus.CANCELLED],
  },
] as const;

function repository(): OwnerOrderRepository {
  return new PrismaOwnerOrderRepository(getDb());
}

function assertOwner(user: AuthenticatedUser): void {
  if (user.role !== UserRole.SHOP_OWNER) {
    throw new OwnerOrderError(
      "OWNER_ONLY",
      "Shop owner access is required.",
      403,
    );
  }
}

function mapFilters(input: OwnerOrderFiltersInput): OwnerOrderFilters {
  const date = input.date;
  const createdFrom = date ? new Date(`${date}T00:00:00.000+05:30`) : undefined;
  const createdTo = createdFrom
    ? new Date(createdFrom.getTime() + 24 * 60 * 60 * 1000)
    : undefined;
  return {
    ...(input.status ? { status: input.status } : {}),
    ...(input.customer ? { customer: input.customer } : {}),
    ...(input.orderNumber ? { orderId: input.orderNumber } : {}),
    ...(createdFrom && createdTo ? { createdFrom, createdTo } : {}),
  };
}

function toListView(order: OwnerOrderListRecord) {
  return {
    id: order.id,
    status: order.status,
    total: order.total.toFixed(2),
    createdAt: order.createdAt.toISOString(),
    customer: order.customer,
    shopName: order.shop.name,
    itemCount: order._count.items,
  };
}

function toDetailView(order: OwnerOrderDetailRecord) {
  return {
    id: order.id,
    status: order.status,
    paymentMethod: order.paymentMethod,
    subtotal: order.subtotal.toFixed(2),
    deliveryFee: order.deliveryFee.toFixed(2),
    total: order.total.toFixed(2),
    customerNote: order.customerNote,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    cancellationReason: order.cancellationReason,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    customer: order.customer,
    shopName: order.shop.name,
    deliveryAddress: {
      ...order.deliveryAddress,
      latitude: order.deliveryAddress.latitude.toString(),
      longitude: order.deliveryAddress.longitude.toString(),
    },
    items: order.items.map((item) => ({
      id: item.id,
      nameEn: item.product.nameEn,
      nameSi: item.product.nameSi,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
      lineTotal: minorUnitsToMoney(
        multiplyMinorUnits(
          moneyToMinorUnits(item.unitPrice.toFixed(2)),
          item.quantity,
        ),
      ),
    })),
    statusHistory: order.statusHistory.map((history) => ({
      ...history,
      createdAt: history.createdAt.toISOString(),
    })),
  };
}

export async function getOwnerOrderDashboard(
  user: AuthenticatedUser,
  filters: OwnerOrderFiltersInput = {},
  orders: OwnerOrderRepository = repository(),
) {
  assertOwner(user);
  const [records, counts] = await Promise.all([
    orders.findManyOwned(user.id, mapFilters(filters)),
    orders.countOwnedByStatus(user.id),
  ]);
  const countMap = new Map(counts.map(({ status, count }) => [status, count]));
  return {
    orders: records.map(toListView),
    summaries: summaryGroups.map((group) => ({
      key: group.key,
      label: group.label,
      count: group.statuses.reduce(
        (total, status) => total + (countMap.get(status) ?? 0),
        0,
      ),
    })),
  };
}

export async function getOwnerOrder(
  user: AuthenticatedUser,
  orderId: string,
  orders: OwnerOrderRepository = repository(),
) {
  assertOwner(user);
  const order = await orders.findOwnedById(user.id, orderId);
  if (!order) {
    throw new OwnerOrderError("ORDER_NOT_FOUND", "Order not found.", 404);
  }
  return toDetailView(order);
}
